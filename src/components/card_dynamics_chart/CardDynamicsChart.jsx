// ---------- График цены одной карточки в рублях — реальные замеры в границах периода дашборда ----------
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { getCardMeasurements } from '../../services/api';
import ChartTooltip from '../chart_tooltip/ChartTooltip';
import styles from './CardDynamicsChart.module.css';

const W = 660;
const H = 375;               // в полтора раза выше прежних 250
const PAD_L = 62;            // место под подписи цен вида «12 000 ₽»
const PAD_R = 14;
const PAD_T = 14;
const PAD_B = 28;
const OUT_OF_STOCK_GAP = 20; // отступ от оси цен до пунктирной линии «нет в наличии»
const AXIS_GAP = 30;         // отступ до подписей дат
const GRID_WIDTH = 0.6;      // пунктирная сетка от подписанных засечек - очень тонкая
const GRID_DASH = '2 4';
const GRID_OPACITY = 0.5;    // цвет сетки - приглушённый текст: темнее в светлой теме, светлее в тёмной

const PRICE_TICK_STEPS = [100, 500, 1000, 5000]; // шаг засечек цены: 100 ₽, крупнее - если засечки сливаются
const MIN_PRICE_TICK_GAP = 3;    // минимальное расстояние между засечками цены, единицы viewBox
const MIN_PRICE_LABEL_GAP = 22;  // минимальное расстояние между подписями цены
const MIN_DATE_LABEL_GAP = 48;   // минимальное расстояние между подписями дат
const DAILY_MAX_DAYS = 62;       // до двух месяцев засечки по дням, дальше - по неделям (понедельник)
const TICK_LEN = 5;
const DAY_MS = 86400000;
const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

const pad2 = (v) => String(v).padStart(2, '0');
const fmtDayMonth = (d) => `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
const fmtRub = (v) => `${Math.round(v).toLocaleString('ru-RU')} ₽`;

// 16.09.26 пн 16:45
const fmtPointTime = (d) =>
  `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${String(d.getFullYear()).slice(-2)} `
  + `${WEEKDAYS[d.getDay()]} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

// 8ч. 37м. / 1д. 2ч. 5м.
function fmtDuration(ms) {
  const totalMin = Math.round(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const minutes = totalMin % 60;
  const parts = [];
  if (days) parts.push(`${days}д.`);
  if (days || hours) parts.push(`${hours}ч.`);
  parts.push(`${minutes}м.`);
  return parts.join(' ');
}

// Изменение к предыдущему замеру с ценой: текст «+10% за 8ч. 37м.» и направление
// (1 - рост, -1 - снижение, 0 - без изменения после округления до 0,1%)
function priceChange(point, prev) {
  const pct = (Math.round((point.price / prev.price - 1) * 1000) / 10) || 0; // || 0 убирает «-0»
  const sign = Math.sign(pct);
  const pctText = `${sign > 0 ? '+' : ''}${pct.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`;
  return { text: `${pctText} за ${fmtDuration(point.ms - prev.ms)}`, sign };
}

// Цвет строки изменения: в светлой теме - цвет события, в тёмной - его светлый оттенок (App.css)
const changeStyle = (sign) => {
  if (sign > 0) return { color: 'var(--change-up)' };
  if (sign < 0) return { color: 'var(--change-down)' };
  return undefined;
};

// Засечки дат на отрезке [fromMs, toMs]: каждый день или каждый понедельник
function buildDateTicks(fromMs, toMs, daily) {
  const d = new Date(fromMs);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() < fromMs) d.setDate(d.getDate() + 1);
  if (!daily) {
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  }
  const ticks = [];
  while (d.getTime() <= toMs) {
    ticks.push(new Date(d));
    d.setDate(d.getDate() + (daily ? 1 : 7));
  }
  return { ticks, stepMs: (daily ? 1 : 7) * DAY_MS };
}

function CardDynamicsChart({ sku, name, url, periodFrom, periodTo }) {
  const theme = useSelector((s) => s.theme.value);
  // Жёлтый: в светлой теме темнее, чтобы линия и текст подсказки читались на белом
  const pointColor = theme === 'dark' ? '#ffd23f' : '#c08f00';

  const [allPoints, setAllPoints] = useState(null);
  const requestIdRef = useRef(0);

  // Подсказка привязана к карточке и периоду: при их смене старая подсказка
  // не совпадает по ключу и считается скрытой - без setState внутри эффекта.
  const requestKey = `${sku}|${periodFrom ? periodFrom.getTime() : ''}|${periodTo ? periodTo.getTime() : ''}`;
  const [tooltipState, setTooltipState] = useState({ key: null, tooltip: null });
  const tooltip = tooltipState.key === requestKey ? tooltipState.tooltip : null;
  const setTooltip = (next) => setTooltipState((cur) => {
    const current = cur.key === requestKey ? cur.tooltip : null;
    return { key: requestKey, tooltip: typeof next === 'function' ? next(current) : next };
  });

  useEffect(() => {
    if (!periodFrom || !periodTo) return;
    const requestId = ++requestIdRef.current;
    getCardMeasurements(sku, periodFrom, periodTo)
      .then((data) => {
        if (requestIdRef.current !== requestId) return;
        setAllPoints(data);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) return;
        setAllPoints([]);
      });
  }, [sku, periodFrom, periodTo]);

  if (allPoints === null) {
    return <p className={styles.muted}>Загрузка…</p>;
  }
  if (allPoints.length === 0) {
    return <p className={styles.muted}>Замеров за этот период нет.</p>;
  }

  // Точки со временем и ссылкой на предыдущий замер с ценой - для третьей строки подсказки.
  // Обычный цикл, а не map: менять переменную внутри колбэка запрещает react-hooks/immutability.
  const points = [];
  let lastPriced = null;
  for (const p of allPoints) {
    const date = new Date(p.parsed_at);
    const item = { date, ms: date.getTime(), price: p.price, prev: p.price !== null ? lastPriced : null };
    if (p.price !== null) lastPriced = item;
    points.push(item);
  }

  const withPrice = points.filter((p) => p.price !== null);
  if (withPrice.length < 2) {
    return <p className={styles.muted}>Недостаточно замеров с ценой для графика.</p>;
  }

  const hasOutOfStock = points.some((p) => p.price === null);
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  // ---------- Ось цен: от нуля до максимума, округлённого вверх до шага засечек ----------
  const maxV = Math.max(...withPrice.map((p) => p.price));
  const tickStep = PRICE_TICK_STEPS.find((step) => {
    const top = Math.max(step, Math.ceil(maxV / step) * step);
    return plotH / (top / step) >= MIN_PRICE_TICK_GAP;
  }) || PRICE_TICK_STEPS[PRICE_TICK_STEPS.length - 1];
  const topV = Math.max(tickStep, Math.ceil(maxV / tickStep) * tickStep);
  const tickCount = topV / tickStep;
  const tickSpacing = plotH / tickCount;
  const labelEvery = [1, 2, 5, 10, 20, 50, 100]
    .find((m) => m * tickSpacing >= MIN_PRICE_LABEL_GAP) || 100;
  const yForPrice = (v) => PAD_T + plotH - (v / topV) * plotH;

  // ---------- Ось времени: от первого замера (с полуночи его дня) до конца периода ----------
  // Засечки по дням или неделям выбираются по длине периода дашборда, а не обрезанного участка.
  const daily = (periodTo.getTime() - periodFrom.getTime()) / DAY_MS <= DAILY_MAX_DAYS;
  const firstDay = new Date(Math.min(...points.map((p) => p.ms)));
  firstDay.setHours(0, 0, 0, 0);
  const fromMs = Math.max(periodFrom.getTime(), firstDay.getTime());
  const toMs = periodTo.getTime();
  const spanMs = Math.max(toMs - fromMs, 1);
  const xForTime = (ms) => PAD_L + ((ms - fromMs) / spanMs) * plotW;
  const { ticks: dateTicks, stepMs } = buildDateTicks(fromMs, toMs, daily);
  const dateTickSpacing = (stepMs / spanMs) * plotW;
  const dateLabelEvery = Math.max(1, Math.ceil(MIN_DATE_LABEL_GAP / dateTickSpacing));

  const priceAreaBottom = PAD_T + plotH;
  const outOfStockY = priceAreaBottom + OUT_OF_STOCK_GAP;
  const dateAxisY = (hasOutOfStock ? outOfStockY : priceAreaBottom) + AXIS_GAP;
  const svgHeight = dateAxisY + 6;

  let d = '';
  let started = false;
  points.forEach((p) => {
    if (p.price === null) { started = false; return; }
    d += `${!started ? 'M' : 'L'} ${xForTime(p.ms).toFixed(1)} ${yForPrice(p.price).toFixed(1)} `;
    started = true;
  });

  const pointTooltip = (p) => {
    const change = p.price !== null && p.prev ? priceChange(p, p.prev) : null;
    return (
      <>
        <div><b>{fmtPointTime(p.date)}</b></div>
        <div><b>{p.price === null ? 'Не было в наличии' : fmtRub(p.price)}</b></div>
        {change && <div style={changeStyle(change.sign)}><b>{change.text}</b></div>}
      </>
    );
  };

  return (
    <div
      className={styles.wrap}
      onMouseMove={(e) => {
        if (tooltip) setTooltip((t) => t && { ...t, x: e.clientX, y: e.clientY });
      }}
    >
      <p className={styles.title}>
        Динамика цены за выбранный период:{' '}
        {url ? <a href={url} target="_blank" rel="noopener noreferrer">{name}</a> : name}
      </p>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${W} ${svgHeight}`}
        preserveAspectRatio="none"
      >
        {/* вертикальная ось цен с засечками */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={priceAreaBottom} stroke="var(--text-muted)" strokeWidth="1" />
        {Array.from({ length: tickCount + 1 }, (_, i) => i).map((i) => {
          const v = i * tickStep;
          const ty = yForPrice(v);
          const labeled = i % labelEvery === 0;
          return (
            <g key={`p${i}`}>
              {labeled && i > 0 && (
                <line
                  x1={PAD_L} y1={ty} x2={W - PAD_R} y2={ty}
                  stroke="var(--text-muted)" strokeOpacity={GRID_OPACITY}
                  strokeWidth={GRID_WIDTH} strokeDasharray={GRID_DASH}
                />
              )}
              <line x1={PAD_L - TICK_LEN} y1={ty} x2={PAD_L} y2={ty} stroke="var(--text-muted)" strokeWidth="1" />
              {labeled && (
                <text x={PAD_L - TICK_LEN - 3} y={ty + 3} textAnchor="end" className={styles.axisLabel}>
                  {fmtRub(v)}
                </text>
              )}
            </g>
          );
        })}

        {/* горизонтальная ось времени с засечками */}
        <line x1={PAD_L} y1={priceAreaBottom} x2={W - PAD_R} y2={priceAreaBottom} stroke="var(--text-muted)" strokeWidth="1" />
        {dateTicks.map((tick, i) => {
          const tx = xForTime(tick.getTime());
          const labeled = i % dateLabelEvery === 0;
          return (
            <g key={`d${i}`}>
              {labeled && (
                <line
                  x1={tx} y1={PAD_T} x2={tx} y2={priceAreaBottom}
                  stroke="var(--text-muted)" strokeOpacity={GRID_OPACITY}
                  strokeWidth={GRID_WIDTH} strokeDasharray={GRID_DASH}
                />
              )}
              <line x1={tx} y1={priceAreaBottom} x2={tx} y2={priceAreaBottom + TICK_LEN} stroke="var(--text-muted)" strokeWidth="1" />
              {labeled && (
                <text x={tx} y={dateAxisY} textAnchor="middle" className={styles.axisLabel}>
                  {fmtDayMonth(tick)}
                </text>
              )}
            </g>
          );
        })}

        {hasOutOfStock && (
          <line
            x1={PAD_L}
            y1={outOfStockY}
            x2={W - PAD_R}
            y2={outOfStockY}
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        )}

        <path d={d} fill="none" stroke={pointColor} strokeWidth="1.4" />

        {points.map((p, i) => (
          <circle
            key={i}
            cx={xForTime(p.ms)}
            cy={p.price === null ? outOfStockY : yForPrice(p.price)}
            r="2.8"
            fill={p.price === null ? 'var(--text-muted)' : pointColor}
            stroke="var(--bg-card)"
            strokeWidth="0.75"
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: pointTooltip(p) })}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
      </svg>

      {tooltip && (
        <ChartTooltip x={tooltip.x} y={tooltip.y} color={pointColor}>
          {tooltip.content}
        </ChartTooltip>
      )}
    </div>
  );
}

export default CardDynamicsChart;