// ---------- График: линия EWMA (цвет по тренду) + линии/точки MACD, оси, всплывающие подсказки ----------
import { useState } from 'react';
import { assignEventToPoints, buildRuns } from '../../utils/analytics';
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

// Три ступени толщины: участки без тренда - самые тонкие, тренды - средние,
// события (линии и точки) - самые заметные
const NONE_LINE_WIDTH = 1.5;
const TREND_LINE_WIDTH = 3;
const MACD_LINE_WIDTH = 6;
const MACD_POINT_RADIUS = 6;

// Разрыв между соседними трендами противоположных направлений, в единицах viewBox (~px)
const TREND_GAP = 2;

// Точка на отрезке a→b на расстоянии dist от a; null, если отрезок короче dist
function pointAlong(ax, ay, bx, by, dist) {
  const len = Math.hypot(bx - ax, by - ay);
  if (len <= dist) return null;
  const t = dist / len;
  return [ax + (bx - ax) * t, ay + (by - ay) * t];
}

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

function MarketChart({ curve, trendEvents, eventEvents, periodFrom, periodTo, onSelectEvent }) {
  const [tooltip, setTooltip] = useState(null);

  const sortedCurve = [...curve].sort((a, b) => new Date(a.parsed_at) - new Date(b.parsed_at));
  const sliceCurve = sortedCurve.filter((p) => {
    const t = new Date(p.parsed_at).getTime();
    return t >= periodFrom.getTime() && t <= periodTo.getTime();
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

          // тренд сразу после тренда противоположного направления - начинаем с отступом
          const prev = ri > 0 ? runs[ri - 1] : null;
          const gapBefore = prev !== null && run.to > run.from
            && prev.direction !== 'none' && run.direction !== 'none'
            && prev.direction !== run.direction;

          let d = '';
          let firstK = run.from;
          if (gapBefore) {
            const start = pointAlong(
              x(run.from), y(points[run.from].level_log),
              x(run.from + 1), y(points[run.from + 1].level_log),
              TREND_GAP,
            );
            if (start) {
              d = `M ${start[0].toFixed(1)} ${start[1].toFixed(1)} `;
            } else {
              d = `M ${x(run.from + 1).toFixed(1)} ${y(points[run.from + 1].level_log).toFixed(1)} `;
            }
            firstK = run.from + 1;
          }
          for (let k = firstK; k <= run.to; k++) {
            const cmd = d === '' && k === firstK ? 'M' : 'L';
            d += `${cmd} ${x(k).toFixed(1)} ${y(points[k].level_log).toFixed(1)} `;
          }
          const hasEvent = run.event !== null;
          return (
            <g key={ri}>
              <path
                d={d}
                fill="none"
                stroke={`var(${colorVar})`}
                strokeWidth={run.direction === 'none' ? NONE_LINE_WIDTH : TREND_LINE_WIDTH}
              />
              {hasEvent && (
                <rect
                  x={x(run.from)}
                  y={PAD_T}
                  width={Math.max(2, x(run.to) - x(run.from))}
                  height={plotH}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectEvent('trend', run.event)}
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
          if (endT < periodFrom.getTime() || startT > periodTo.getTime()) return null;

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
                onClick={() => onSelectEvent('event', ev)}
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
              <path d={d} fill="none" stroke="var(--bg-card)" strokeWidth={MACD_LINE_WIDTH + 1.5} strokeLinecap="round" />
              <path d={d} fill="none" stroke={`var(${colorVar})`} strokeWidth={MACD_LINE_WIDTH} strokeLinecap="round" />
              <rect
                x={x(fromIdx)}
                y={PAD_T}
                width={Math.max(2, x(toIdx) - x(fromIdx))}
                height={plotH}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectEvent('event', ev)}
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