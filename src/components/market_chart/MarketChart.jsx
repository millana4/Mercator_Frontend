// ---------- График: линия EWMA (цвет по тренду) + линии/точки MACD, оси, всплывающие подсказки ----------
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { getPeriodRange, assignEventToPoints, buildRuns } from '../../utils/analytics';
import { fmtShortDate, fmtDate, fmtArrow, fmtPct } from '../../utils/format';
import { TREND_LABEL, EVENT_LABEL, CHART_TRAJECTORY_TOOLTIP } from '../../constants/labels';
import ChartTooltip from '../chart_tooltip/ChartTooltip';
import InfoTooltip from '../info_tooltip/InfoTooltip';
import styles from './MarketChart.module.css';

const W = 660;
const H = 250;
const PAD_L = 46;
const PAD_R = 14;
const PAD_T = 20;
const PAD_B = 28;

const MACD_LINE_WIDTH = 5;
const MACD_POINT_RADIUS = 5;

function findClosestIndex(curve, targetDate) {
  const t = new Date(targetDate).getTime();
  let bestIdx = -1;
  let bestDiff = Infinity;
  curve.forEach((p, i) => {
    const diff = Math.abs(new Date(p.parsed_at).getTime() - t);
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
  });
  return bestIdx;
}

function MarketChart({ curve, trendEvents, eventEvents }) {
  const { period, customFrom, customTo } = useSelector((s) => s.dashboard);
  const [tooltip, setTooltip] = useState(null); // { x, y, color, content }

  const sortedCurve = [...curve].sort((a, b) => new Date(a.parsed_at) - new Date(b.parsed_at));
  const { from, to } = getPeriodRange(period, customFrom, customTo, sortedCurve);
  const sliceCurve = sortedCurve.filter((p) => {
    const t = new Date(p.parsed_at).getTime();
    return t >= from.getTime() && t <= to.getTime();
  });

  if (sliceCurve.length < 2) {
    return <p className={styles.muted}>Недостаточно точек для графика за выбранный период.</p>;
  }

  const points = assignEventToPoints(sliceCurve, trendEvents);
  const n = points.length;
  const values = points.map((p) => p.level_log);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const spanV = (maxV - minV) || 1;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const x = (i) => PAD_L + (i / (n - 1)) * plotW;
  const y = (v) => PAD_T + plotH - ((v - minV) / spanV) * plotH;

  const runs = buildRuns(points);

  const showTooltip = (clientX, clientY, colorVar, content) => {
    setTooltip({ x: clientX, y: clientY, color: colorVar, content });
  };
  const hideTooltip = () => setTooltip(null);

  const eventTooltipContent = (ev) => (
    <>
      <div><b>Событие: {EVENT_LABEL[ev.direction]}</b></div>
      <div>{fmtDate(ev.start_at)}{ev.start_at !== ev.end_at ? ` — ${fmtDate(ev.end_at)}` : ''}</div>
      <div>Доля участвующих: {fmtPct(ev.participation_pct)}</div>
      <div>Величина изменения: {fmtArrow(ev.direction, ev.magnitude_pct, '%')}</div>
      <div>Скорость изменения: {fmtArrow(ev.direction, ev.speed_pct_per_day, '%/сутки')}</div>
    </>
  );

  return (
    <div
      className={styles.wrap}
      onMouseMove={(e) => {
        if (tooltip) setTooltip((t) => t && { ...t, x: e.clientX, y: e.clientY });
      }}
    >
      <div className={styles.caption}>
        <span>Траектория рынка</span>
        <InfoTooltip text={CHART_TRAJECTORY_TOOLTIP} />
      </div>

      <svg className={styles.svg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {[minV, (minV + maxV) / 2, maxV].map((v, idx) => (
          <g key={idx}>
            <line x1={PAD_L} y1={y(v)} x2={W - PAD_R} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
            <text x={PAD_L - 8} y={y(v) + 3} textAnchor="end" className={styles.axisLabel}>
              {v.toFixed(2)}
            </text>
          </g>
        ))}

        {[0, 1, 2, 3, 4].map((k) => {
          const idx = Math.round((k * (n - 1)) / 4);
          return (
            <text key={k} x={x(idx)} y={H - 8} textAnchor="middle" className={styles.axisLabel}>
              {fmtShortDate(points[idx].parsed_at)}
            </text>
          );
        })}

        {runs.map((run, ri) => {
          const colorVar = run.direction === 'up' ? '--trend-up' : run.direction === 'down' ? '--trend-down' : '--trend-none';
          let d = '';
          for (let k = run.from; k <= run.to; k++) {
            d += `${k === run.from ? 'M' : 'L'} ${x(k).toFixed(1)} ${y(points[k].level_log).toFixed(1)} `;
          }
          const hasEvent = run.event !== null;
          return (
            <g key={ri}>
              <path d={d} fill="none" stroke={`var(${colorVar})`} strokeWidth="2.5" />
              {hasEvent && (
                <rect
                  x={x(run.from)}
                  y={PAD_T}
                  width={Math.max(2, x(run.to) - x(run.from))}
                  height={plotH}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => showTooltip(e.clientX, e.clientY, colorVar, (
                    <>
                      <div><b>Тренд: {TREND_LABEL[run.event.direction]}</b></div>
                      <div>{fmtDate(run.event.start_at)} — {run.event.is_open ? 'по настоящее время' : fmtDate(run.event.end_at)}</div>
                      <div>Доля участвующих: {fmtPct(run.event.participation_pct)}</div>
                      <div>Величина изменения: {fmtArrow(run.event.direction, run.event.magnitude_pct, '%')}</div>
                      <div>Скорость изменения: {fmtArrow(run.event.direction, run.event.speed_pct_per_day, '%/сутки')}</div>
                    </>
                  ))}
                  onMouseLeave={hideTooltip}
                />
              )}
            </g>
          );
        })}

        {eventEvents.map((ev, ei) => {
          const startT = new Date(ev.start_at).getTime();
          const endT = new Date(ev.end_at).getTime();
          if (endT < from.getTime() || startT > to.getTime()) return null;

          const colorVar = ev.direction === 'up' ? '--event-up' : '--event-down';
          const isSinglePoint = ev.start_at === ev.end_at;

          if (isSinglePoint) {
            const idx = findClosestIndex(sliceCurve, ev.start_at);
            if (idx === -1) return null;
            return (
              <circle
                key={ei}
                cx={x(idx)}
                cy={y(points[idx].level_log)}
                r={MACD_POINT_RADIUS}
                fill={`var(${colorVar})`}
                stroke="var(--bg-card)"
                strokeWidth="0.75"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => showTooltip(e.clientX, e.clientY, colorVar, eventTooltipContent(ev))}
                onMouseLeave={hideTooltip}
              />
            );
          }

          const startIdx = findClosestIndex(sliceCurve, ev.start_at);
          const endIdx = findClosestIndex(sliceCurve, ev.end_at);
          if (startIdx === -1 || endIdx === -1) return null;
          const fromIdx = Math.min(startIdx, endIdx);
          const toIdx = Math.max(startIdx, endIdx);

          let d = '';
          for (let k = fromIdx; k <= toIdx; k++) {
            d += `${k === fromIdx ? 'M' : 'L'} ${x(k).toFixed(1)} ${y(points[k].level_log).toFixed(1)} `;
          }

          return (
            <g key={ei}>
              <path
                d={d}
                fill="none"
                stroke="var(--bg-card)"
                strokeWidth={MACD_LINE_WIDTH + 1.5}
                strokeLinecap="round"
              />
              <path d={d} fill="none" stroke={`var(${colorVar})`} strokeWidth={MACD_LINE_WIDTH} strokeLinecap="round" />
              <rect
                x={x(fromIdx)}
                y={PAD_T}
                width={Math.max(2, x(toIdx) - x(fromIdx))}
                height={plotH}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => showTooltip(e.clientX, e.clientY, colorVar, eventTooltipContent(ev))}
                onMouseLeave={hideTooltip}
              />
            </g>
          );
        })}
      </svg>

      {tooltip && (
        <ChartTooltip x={tooltip.x} y={tooltip.y} color={tooltip.color}>
          {tooltip.content}
        </ChartTooltip>
      )}
    </div>
  );
}

export default MarketChart;