// ---------- График анализа поисковой выдачи: повторяемость за сутки, отклонения, погода ----------
import { useState } from 'react';
import { SEARCH_DYNAMICS_LABELS as L } from '../../constants/labels';
import {
  fmtDayMonth, fmtNum1, fmtPct, fmtPct1, fmtPrecip, fmtRunDay, fmtTemp, fmtTempShort, fmtWeekday,
} from '../../utils/format';
import ChartTooltip from '../chart_tooltip/ChartTooltip';
import InfoTooltip from '../info_tooltip/InfoTooltip';
import styles from './SearchDynamicsChart.module.css';

const W = 1100;
const H = 352;
const PAD_L = 46;
const PAD_R = 14;
const WEATHER_H = 56;          // полоса погоды над графиком: значок и температура
const PAD_T = WEATHER_H + 8;
const PAD_B = 40;              // подписи дат в две строки
const ICON_Y = 18;             // центр значка от верха полосы погоды
const TEMP_Y = 48;             // базовая линия температуры от верха полосы погоды

const DAY_MS = 24 * 3600 * 1000;
const GRAY_R = 3;              // серая точка, диаметр 6
const RED_R = 6;               // красная точка, диаметр 12
const HIT_R = 10;              // область наведения точки
const GRAY_LINE_WIDTH = 1.5;
const RED_LINE_WIDTH = 3;
const MIN_TICK_GAP = 64;       // минимум между подписями дат, единиц viewBox (~px)
const MIN_WEATHER_LABEL_W = 30; // уже - значок и температуру над клеткой не рисуем

// Подложка по температуре: синяя холоднее нуля, красная теплее; насыщенность до ±TEMP_SPAN
const TEMP_SPAN = 20;
const TEMP_MAX_OPACITY = 0.32;
const COLD_RGB = '66, 133, 244';
const WARM_RGB = '234, 67, 53';

// Значки погоды: рисунок в своих координатах (облако ~21x11), масштаб - до ~26 px
const ICON_SCALE = 1.2;
const SUN_RAYS = [0, 45, 90, 135, 180, 225, 270, 315];
const CLOUD_PATH = 'M -10 5 A 4.5 4.5 0 0 1 -9 -3.5 A 6.5 6.5 0 0 1 3 -6 '
  + 'A 5 5 0 0 1 10.5 0 A 3 3 0 0 1 10 5 Z';
const DROP_PATH = 'M 0 -2.6 C 1.6 -0.2 2 1 0 2.4 C -2 1 -1.6 -0.2 0 -2.6 Z';

const has = (v) => v !== null && v !== undefined;

function tempFill(t) {
  if (!has(t)) return 'transparent';
  const share = Math.min(Math.abs(t) / TEMP_SPAN, 1);
  return `rgba(${t < 0 ? COLD_RGB : WARM_RGB}, ${(share * TEMP_MAX_OPACITY).toFixed(3)})`;
}

// Полночь суток, в которые попадает момент t (мс)
function dayStart(t) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function Sun({ x, y, r, rayFrom, rayTo }) {
  return (
    <g className={styles.sun}>
      <circle cx={x} cy={y} r={r} />
      {SUN_RAYS.map((deg) => {
        const a = (deg * Math.PI) / 180;
        return (
          <line key={deg} x1={x + Math.cos(a) * rayFrom} y1={y + Math.sin(a) * rayFrom}
            x2={x + Math.cos(a) * rayTo} y2={y + Math.sin(a) * rayTo} />
        );
      })}
    </g>
  );
}

function Drop({ x, y }) {
  return <path d={DROP_PATH} transform={`translate(${x} ${y})`} className={styles.drop} />;
}

function Flake({ x, y }) {
  const s = 2.8;
  return (
    <g className={styles.flake}>
      {[0, 60, 120].map((deg) => {
        const a = (deg * Math.PI) / 180;
        return (
          <line key={deg} x1={x - Math.cos(a) * s} y1={y - Math.sin(a) * s}
            x2={x + Math.cos(a) * s} y2={y + Math.sin(a) * s} />
        );
      })}
    </g>
  );
}

// Значок суток: небо (clear | partly | cloudy) и осадки (none | rain | snow | mixed).
// Ясно без осадков - солнце; иначе облако, из-за которого при ясно/переменной выглядывает солнце.
function WeatherIcon({ sky, precip, x, y }) {
  const wet = has(precip) && precip !== 'none';
  if (!has(sky) && !wet) return null;
  const fullSun = sky === 'clear' && !wet;
  const peekSun = !fullSun && (sky === 'clear' || sky === 'partly');
  const drops = !wet ? [] : precip === 'snow' ? ['flake', 'flake']
    : precip === 'mixed' ? ['drop', 'flake'] : ['drop', 'drop'];
  return (
    <g transform={`translate(${x} ${y}) scale(${ICON_SCALE})`} pointerEvents="none">
      {fullSun && <Sun x={0} y={0} r={5.5} rayFrom={7.5} rayTo={10} />}
      {peekSun && <Sun x={-5} y={-5} r={4.5} rayFrom={6} rayTo={8} />}
      {!fullSun && <path d={CLOUD_PATH} transform="translate(2 1)" className={styles.cloud} />}
      {drops.map((kind, i) => {
        const px = i === 0 ? -3 : 5;
        return kind === 'drop' ? <Drop key={i} x={px} y={10.5} /> : <Flake key={i} x={px} y={10.5} />;
      })}
    </g>
  );
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

  // Ось времени - целые календарные сутки: от полуночи первого дня до полуночи после последнего
  const allTimes = [...slice.map((p) => p.t), ...weatherDays.map((w) => w.t)];
  const domFrom = dayStart(Math.min(...allTimes));
  const domTo = dayStart(Math.max(...allTimes)) + DAY_MS;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const x = (t) => PAD_L + ((t - domFrom) / (domTo - domFrom)) * plotW;
  const y = (v) => PAD_T + plotH - (v / 100) * plotH;
  const dayW = (plotW * DAY_MS) / (domTo - domFrom);
  const stripTop = PAD_T - WEATHER_H;

  // Сутки на оси: граница - полночь (тонкая линия), подпись даты - в полдень, посередине суток;
  // шаг подписей, чтобы они не наезжали друг на друга
  const dayStarts = [];
  for (let d = domFrom; d < domTo; d += DAY_MS) dayStarts.push(d);
  const tickStep = Math.max(1, Math.ceil(MIN_TICK_GAP / dayW));

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
      <div className={styles.tipHead}>{fmtRunDay(p.run_at)} {L.comparedWith} {fmtRunDay(p.prev_run)}</div>
      <div>{L.repeated}: {fmtPct1(p.repeat_pct)}</div>
      {p.alert && (
        <>
          <div><b>{L.alert}</b></div>
          <div><b>{L.alertText}</b></div>
          {has(p.band_low) && has(p.band_high) && (
            <div>{L.corridor}: {fmtNum1(p.band_low)}–{fmtPct1(p.band_high)}</div>
          )}
        </>
      )}
    </>
  );

  const weatherTooltip = (w) => (
    <>
      {has(w.temp_mean) && <div>{L.weatherMean}: {fmtTemp(w.temp_mean)}</div>}
      {has(w.temp_min) && has(w.temp_max) && (
        <div>{L.weatherMinMax}: {fmtNum1(w.temp_min)} / {fmtTemp(w.temp_max)}</div>
      )}
      {has(w.cloud_mean) && <div>{L.weatherCloud}: {fmtPct(w.cloud_mean)}</div>}
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
      <div className={styles.caption}>
        <span>{L.caption}</span>
        <InfoTooltip text={L.captionTooltip} />
      </div>

      <svg className={styles.svg} viewBox={`0 0 ${W} ${H}`}>
        {/* 1. Погода на каждые сутки: подложка клетки, значок и средняя температура посередине */}
        {weatherDays.map((w) => {
          const cellFrom = dayStart(w.t);
          const cx = x(cellFrom + DAY_MS / 2);
          const t = w.temp_mean;
          const wide = dayW >= MIN_WEATHER_LABEL_W;
          return (
            <g key={`w${w.run_at}`}>
              <rect x={x(cellFrom)} y={stripTop} width={dayW} height={plotH + WEATHER_H}
                fill={tempFill(t)} />
              {wide && <WeatherIcon sky={w.sky} precip={w.precip_kind} x={cx} y={stripTop + ICON_Y} />}
              {has(t) && wide && (
                <text x={cx} y={stripTop + TEMP_Y} textAnchor="middle" className={styles.temp}>
                  {fmtTempShort(t)}
                </text>
              )}
              <rect x={x(cellFrom)} y={stripTop} width={dayW} height={WEATHER_H} fill="transparent"
                onMouseEnter={(e) => show(e, '--text-muted', weatherTooltip(w))} onMouseLeave={hide} />
            </g>
          );
        })}

        {/* 2. Сетка 0-100% */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={`g${v}`}>
            <line x1={PAD_L} y1={y(v)} x2={W - PAD_R} y2={y(v)} className={styles.grid} strokeWidth="1" />
            <text x={PAD_L - 8} y={y(v) + 4} textAnchor="end" className={styles.axisLabel}>{v}%</text>
          </g>
        ))}

        {/* 3. Сутки: граница в полночь, подпись даты и дня недели - в полдень */}
        {dayStarts.map((d, k) => {
          if (k % tickStep !== 0) return null;
          const noon = d + DAY_MS / 2;
          return (
            <g key={`d${d}`}>
              <line x1={x(d)} y1={PAD_T} x2={x(d)} y2={H - PAD_B} className={styles.grid} strokeWidth="0.5" />
              <text x={x(noon)} y={H - PAD_B + 16} textAnchor="middle" className={styles.axisLabel}>
                {fmtDayMonth(d)}
                <tspan x={x(noon)} dy="14">{fmtWeekday(d)}</tspan>
              </text>
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