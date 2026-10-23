// ---------- График анализа поисковой выдачи: повторяемость за сутки, отклонения, погода ----------
import { useState } from 'react';
import { SEARCH_DYNAMICS_LABELS as L } from '../../constants/labels';
import {
  fmtDayMonth, fmtNum1, fmtPct1, fmtPrecip, fmtRunLabel, fmtTemp, fmtTempShort, fmtWeekday,
} from '../../utils/format';
import ChartTooltip from '../chart_tooltip/ChartTooltip';
import styles from './SearchDynamicsChart.module.css';

const W = 1100;
const H = 320;
const PAD_L = 46;
const PAD_R = 14;
const WEATHER_H = 24;          // полоса с температурой над графиком
const PAD_T = WEATHER_H + 8;
const PAD_B = 40;              // подписи дат в две строки

const DAY_MS = 24 * 3600 * 1000;
const GRAY_R = 3;              // серая точка, диаметр 6
const RED_R = 6;               // красная точка, диаметр 12
const HIT_R = 10;              // область наведения точки
const GRAY_LINE_WIDTH = 1.5;
const RED_LINE_WIDTH = 3;
const MIN_TICK_GAP = 64;       // минимум между подписями дат, единиц viewBox (~px)
const MIN_TEMP_LABEL_W = 30;   // уже - температуру над полосой не подписываем

// Подложка по температуре: синяя холоднее нуля, красная теплее; насыщенность до ±TEMP_SPAN
const TEMP_SPAN = 20;
const TEMP_MAX_OPACITY = 0.32;
const COLD_RGB = '66, 133, 244';
const WARM_RGB = '234, 67, 53';

const has = (v) => v !== null && v !== undefined;

function tempFill(t) {
  if (!has(t)) return 'transparent';
  const share = Math.min(Math.abs(t) / TEMP_SPAN, 1);
  return `rgba(${t < 0 ? COLD_RGB : WARM_RGB}, ${(share * TEMP_MAX_OPACITY).toFixed(3)})`;
}

function SearchDynamicsChart({ points, weather, periodFrom, periodTo }) {
  const [tooltip, setTooltip] = useState(null);

  const inPeriod = (t) => t >= periodFrom.getTime() && t <= periodTo.getTime();
  const slice = points
    .map((p) => ({ ...p, t: new Date(p.run_at).getTime(), tPrev: new Date(p.prev_run).getTime() }))
    .filter((p) => inPeriod(p.t))
    .sort((a, b) => a.t - b.t);
  const weatherDays = weather
    .map((w) => ({ ...w, t: new Date(w.run_at).getTime() }))
    .filter((w) => inPeriod(w.t))
    .sort((a, b) => a.t - b.t);

  if (slice.length === 0) {
    return <p className={styles.muted}>{L.emptyPeriod}</p>;
  }

  // Ось времени - все сутки с точками и погодой, по полсуток с краёв
  const allTimes = [...slice.map((p) => p.t), ...weatherDays.map((w) => w.t)];
  const domFrom = Math.min(...allTimes) - DAY_MS / 2;
  const domTo = Math.max(...allTimes) + DAY_MS / 2;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const x = (t) => PAD_L + ((t - domFrom) / (domTo - domFrom)) * plotW;
  const y = (v) => PAD_T + plotH - (v / 100) * plotH;
  const dayW = (plotW * DAY_MS) / (domTo - domFrom);

  // Сутки на оси: граница - полночь (тонкая линия), подпись даты - в полдень, посередине суток;
  // шаг подписей, чтобы они не наезжали друг на друга
  const dayStarts = [];
  const firstDay = new Date(domFrom);
  firstDay.setHours(0, 0, 0, 0);
  for (let d = firstDay.getTime(); d <= domTo; d += DAY_MS) dayStarts.push(d);
  const tickStep = Math.max(1, Math.ceil(MIN_TICK_GAP / dayW));
  const inDomain = (t) => t >= domFrom && t <= domTo;

  const linePath = slice
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.t).toFixed(1)} ${y(p.repeat_pct).toFixed(1)}`)
    .join(' ');

  // Красный участок - сутки отклонения (prev_run -> run_at). Если предыдущей точки
  // за эти сутки на линии нет, начало участка - на серой линии в момент prev_run.
  const redSegments = slice
    .map((p, i) => {
      if (!p.alert || i === 0) return null;
      const prev = slice[i - 1];
      const start = Math.max(prev.t, p.tPrev);
      const frac = (start - prev.t) / (p.t - prev.t);
      const yStart = prev.repeat_pct + frac * (p.repeat_pct - prev.repeat_pct);
      return {
        key: p.run_at,
        d: `M ${x(start).toFixed(1)} ${y(yStart).toFixed(1)} L ${x(p.t).toFixed(1)} ${y(p.repeat_pct).toFixed(1)}`,
      };
    })
    .filter(Boolean);

  const show = (e, color, content) => setTooltip({ x: e.clientX, y: e.clientY, color, content });
  const hide = () => setTooltip(null);

  const pointTooltip = (p) => (
    <>
      <div>{fmtRunLabel(p.prev_run)} → {fmtRunLabel(p.run_at)}</div>
      <div>{L.repeated}: {fmtPct1(p.repeat_pct)}</div>
      {p.alert && (
        <>
          <div><b>{L.alert}</b></div>
          {has(p.band_low) && has(p.band_high) && (
            <div>{L.corridor}: {fmtNum1(p.band_low)}–{fmtPct1(p.band_high)}</div>
          )}
        </>
      )}
    </>
  );

  const weatherTooltip = (w) => (
    <>
      <div>{fmtRunLabel(w.run_at)}</div>
      {has(w.temp_mean) && <div>{L.weatherMean}: {fmtTemp(w.temp_mean)}</div>}
      {has(w.temp_now) && <div>{L.weatherNow}: {fmtTemp(w.temp_now)}</div>}
      {has(w.temp_min) && has(w.temp_max) && (
        <div>{L.weatherMinMax}: {fmtNum1(w.temp_min)} / {fmtTemp(w.temp_max)}</div>
      )}
      {has(w.precip) && <div>{L.weatherPrecip}: {fmtPrecip(w.precip)}</div>}
    </>
  );

  return (
    <div
      className={styles.wrap}
      onMouseMove={(e) => {
        if (tooltip) setTooltip((t) => t && { ...t, x: e.clientX, y: e.clientY });
      }}
    >
      <div className={styles.caption}>{L.caption}</div>

      <svg className={styles.svg} viewBox={`0 0 ${W} ${H}`}>
        {/* 1. Погода на каждые сутки: подложка и средняя температура над моментом снимка */}
        {weatherDays.map((w) => {
          const left = x(w.t - DAY_MS / 2);
          const t = w.temp_mean;
          return (
            <g key={`w${w.run_at}`}>
              <rect x={left} y={PAD_T - WEATHER_H} width={dayW} height={plotH + WEATHER_H}
                fill={tempFill(t)} />
              {has(t) && dayW >= MIN_TEMP_LABEL_W && (
                <text x={x(w.t)} y={PAD_T - WEATHER_H / 2 + 4} textAnchor="middle" className={styles.temp}>
                  {fmtTempShort(t)}
                </text>
              )}
              <rect x={left} y={PAD_T - WEATHER_H} width={dayW} height={WEATHER_H} fill="transparent"
                onMouseEnter={(e) => show(e, '--text-muted', weatherTooltip(w))} onMouseLeave={hide} />
            </g>
          );
        })}

        {/* 2. Сетка 0-100% */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={`g${v}`}>
            <line x1={PAD_L} y1={y(v)} x2={W - PAD_R} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
            <text x={PAD_L - 8} y={y(v) + 4} textAnchor="end" className={styles.axisLabel}>{v}%</text>
          </g>
        ))}

        {/* 3. Сутки: граница в полночь, подпись даты и дня недели - в полдень */}
        {dayStarts.map((d, k) => {
          if (k % tickStep !== 0) return null;
          const noon = d + DAY_MS / 2;
          return (
            <g key={`d${d}`}>
              {inDomain(d) && (
                <line x1={x(d)} y1={PAD_T} x2={x(d)} y2={H - PAD_B} stroke="var(--border)" strokeWidth="0.5" />
              )}
              {inDomain(noon) && (
                <text x={x(noon)} y={H - PAD_B + 16} textAnchor="middle" className={styles.axisLabel}>
                  {fmtDayMonth(d)}
                  <tspan x={x(noon)} dy="14">{fmtWeekday(d)}</tspan>
                </text>
              )}
            </g>
          );
        })}

        {/* 4. Линия повторяемости и красные участки суток отклонения */}
        <path d={linePath} fill="none" stroke="var(--text-muted)" strokeWidth={GRAY_LINE_WIDTH} />
        {redSegments.map((s) => (
          <path key={`r${s.key}`} d={s.d} fill="none" stroke="var(--danger)"
            strokeWidth={RED_LINE_WIDTH} strokeLinecap="round" />
        ))}

        {/* 5. Точки: серые, отклонения - красные; подсказка по наведению */}
        {slice.map((p) => (
          <g key={`p${p.run_at}`}>
            <circle cx={x(p.t)} cy={y(p.repeat_pct)} r={p.alert ? RED_R : GRAY_R}
              fill={p.alert ? 'var(--danger)' : 'var(--text-muted)'}
              stroke="var(--bg-card)" strokeWidth={p.alert ? 1.5 : 0} />
            <circle cx={x(p.t)} cy={y(p.repeat_pct)} r={HIT_R} fill="transparent"
              onMouseEnter={(e) => show(e, p.alert ? '--danger' : '--text-muted', pointTooltip(p))}
              onMouseLeave={hide} />
          </g>
        ))}
      </svg>

      {tooltip && (
        <ChartTooltip x={tooltip.x} y={tooltip.y} color={tooltip.color}>
          {tooltip.content}
        </ChartTooltip>
      )}
    </div>
  );
}

export default SearchDynamicsChart;