// ---------- График цены одной карточки в рублях — реальные замеры в границах периода дашборда ----------
// Зум по времени как на картах: «+» / «−» справа от графика, приближение к правому
// краю (последние замеры), приближенный участок двигается перетаскиванием мышью.
// Шкала цен не меняется.
import { useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { getCardMeasurements } from '../../services/api';
import { CARD_CHART_LABELS } from '../../constants/labels';
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
const POINT_R = 2.8;             // радиус точки замера
const POINT_RING = 0.75;         // тёмный ободок точки (цвет фона); в плотной группе - дуга 270° с пропуском справа
const MERGE_DIST = POINT_R;      // центры ближе радиуса - верх и низ точек сливаются в полосу
const RING_GAP = Math.SQRT1_2 * POINT_R; // пропуск дуги: хорда справа между углами ±45°
const RING_SPACING = POINT_R * 2; // обводится точка не ближе диаметра к прошлой обведённой
const ZOOM_STEP = 1.3;           // «+» / «−» - в 1,3 раза по времени
const MIN_VIEW_MS = 3 * 3600000; // ближе трёх часов не приближаем
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
  const svgRef = useRef(null);
  const dragRef = useRef(null);            // перетаскивание: {x, view} в момент нажатия
  const [dragging, setDragging] = useState(false);
  const clipId = `cdc-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  // Подсказка привязана к карточке и периоду: при их смене старая подсказка
  // не совпадает по ключу и считается скрытой - без setState внутри эффекта.
  const requestKey = `${sku}|${periodFrom ? periodFrom.getTime() : ''}|${periodTo ? periodTo.getTime() : ''}`;
  const [tooltipState, setTooltipState] = useState({ key: null, tooltip: null });
  const tooltip = tooltipState.key === requestKey ? tooltipState.tooltip : null;
  const setTooltip = (next) => setTooltipState((cur) => {
    const current = cur.key === requestKey ? cur.tooltip : null;
    return { key: requestKey, tooltip: typeof next === 'function' ? next(current) : next };
  });

  // Видимый участок времени {from, to} в мс; null - весь период. Привязан к карточке
  // и периоду, как подсказка: при их смене зум сбрасывается без setState в эффекте.
  const [zoomState, setZoomState] = useState({ key: null, view: null });
  const view = zoomState.key === requestKey ? zoomState.view : null;
  const setView = (next) => setZoomState({ key: requestKey, view: next });

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
  const firstDay = new Date(Math.min(...points.map((p) => p.ms)));
  firstDay.setHours(0, 0, 0, 0);
  const fromMs = Math.max(periodFrom.getTime(), firstDay.getTime());
  const toMs = periodTo.getTime();

  // Видимый участок при зуме: не выходит за [fromMs, toMs]; во весь период - null
  const clampView = (from, to) => {
    const span = to - from;
    if (span >= toMs - fromMs) return null;
    let f = Math.max(fromMs, from);
    let t = f + span;
    if (t > toMs) {
      t = toMs;
      f = t - span;
    }
    return { from: f, to: t };
  };
  const viewFrom = view ? view.from : fromMs;
  const viewTo = view ? view.to : toMs;
  const spanMs = Math.max(viewTo - viewFrom, 1);
  const canZoomIn = spanMs > MIN_VIEW_MS;

  // Правый край видимого участка остаётся на месте: приближаются последние замеры
  const zoomBy = (factor) => {
    const span = Math.max(spanMs / factor, MIN_VIEW_MS);
    setView(clampView(viewTo - span, viewTo));
  };

  // Засечки по дням или неделям - по длине видимого участка (без зума - весь период)
  const daily = spanMs / DAY_MS <= DAILY_MAX_DAYS;
  const xForTime = (ms) => PAD_L + ((ms - viewFrom) / spanMs) * plotW;
  const { ticks: dateTicks, stepMs } = buildDateTicks(viewFrom, viewTo, daily);
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

  // Плотная группа: центр ближе радиуса к соседнему замеру - верх и низ точек сливаются
  // в полосу. В ней все точки заливкой, а у каждой второй-третьей (не ближе RING_SPACING
  // к прошлой обведённой) - ободок дугой 270° с пропуском справа: видно, что это точки.
  // Остальные точки (одиночные и с небольшим перекрытием) - с полным ободком, как раньше.
  const xy = points.map((p) => [xForTime(p.ms), p.price === null ? outOfStockY : yForPrice(p.price)]);
  const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < MERGE_DIST;
  const overlapped = xy.map((pt, i) => (i > 0 && near(pt, xy[i - 1]))
    || (i < xy.length - 1 && near(pt, xy[i + 1])));
  const ringed = new Set();
  let lastRing = null;
  for (let i = 0; i < xy.length; i += 1) {
    if (!overlapped[i]) continue;
    if (!lastRing || Math.hypot(xy[i][0] - lastRing[0], xy[i][1] - lastRing[1]) >= RING_SPACING) {
      ringed.add(i);
      lastRing = xy[i];
    }
  }

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

  // Перетаскивание приближенного участка: смещение мыши в пикселях -> сдвиг по времени
  const startDrag = (e) => {
    if (!view) return;
    e.preventDefault();
    dragRef.current = { x: e.clientX, view };
    setDragging(true);
    setTooltip(null);
  };
  const moveDrag = (e) => {
    const drag = dragRef.current;
    if (!drag || !svgRef.current) return;
    const pxToUnits = W / svgRef.current.getBoundingClientRect().width;
    const shiftMs = -(e.clientX - drag.x) * pxToUnits * ((drag.view.to - drag.view.from) / plotW);
    setView(clampView(drag.view.from + shiftMs, drag.view.to + shiftMs));
  };
  const stopDrag = () => {
    dragRef.current = null;
    setDragging(false);
  };

  const svgClass = `${styles.svg} ${view ? (dragging ? styles.grabbing : styles.grab) : ''}`;

  return (
    <div
      className={styles.wrap}
      onMouseMove={(e) => {
        if (dragRef.current) moveDrag(e);
        else if (tooltip) setTooltip((t) => t && { ...t, x: e.clientX, y: e.clientY });
      }}
    >
      <p className={styles.title}>
        Динамика цены за выбранный период:{' '}
        {url ? <a href={url} target="_blank" rel="noopener noreferrer">{name}</a> : name}
      </p>
      <div className={styles.chartRow}>
        <svg
          ref={svgRef}
          className={svgClass}
          viewBox={`0 0 ${W} ${svgHeight}`}
          preserveAspectRatio="none"
          onMouseDown={startDrag}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={PAD_L} y={0} width={plotW} height={svgHeight} />
            </clipPath>
          </defs>
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

          <g clipPath={`url(#${clipId})`}>
            <path d={d} fill="none" stroke={pointColor} strokeWidth="1.4" />

            {/* Слой 1 - точки плотной группы заливкой: сливаются в жёлтую полосу.
                Слой 2 - остальные точки с полным ободком и обведённые точки плотной группы
                с ободком-дугой 270° (пропуск справа): видно, что это точки, а не линия */}
            {[false, true].map((top) => points.map((p, i) => {
              const merged = overlapped[i];
              if (!top && !merged) return null;
              if (top && merged && !ringed.has(i)) return null;
              const [cx, cy] = xy[i];
              const fullRing = top && !merged;
              return (
                <g key={`${top ? 't' : 'b'}${i}`}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={POINT_R}
                    fill={p.price === null ? 'var(--text-muted)' : pointColor}
                    stroke={fullRing ? 'var(--bg-card)' : undefined}
                    strokeWidth={fullRing ? POINT_RING : undefined}
                    style={{ cursor: view ? undefined : 'pointer' }}
                    onMouseEnter={(e) => {
                      if (!dragRef.current) setTooltip({ x: e.clientX, y: e.clientY, content: pointTooltip(p) });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                  {top && merged && (
                    // дуга 270°: от +45° (справа снизу) через низ, лево и верх до -45° (справа сверху)
                    <path
                      d={`M ${cx + RING_GAP} ${cy + RING_GAP} A ${POINT_R} ${POINT_R} 0 1 1 ${cx + RING_GAP} ${cy - RING_GAP}`}
                      fill="none"
                      stroke="var(--bg-card)"
                      strokeWidth={POINT_RING}
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            }))}
          </g>
        </svg>

        <div className={styles.zoom}>
          <button type="button" className={styles.zoomBtn} title={CARD_CHART_LABELS.zoomIn}
                  aria-label={CARD_CHART_LABELS.zoomIn} disabled={!canZoomIn}
                  onClick={() => zoomBy(ZOOM_STEP)}>+</button>
          <button type="button" className={styles.zoomBtn} title={CARD_CHART_LABELS.zoomOut}
                  aria-label={CARD_CHART_LABELS.zoomOut} disabled={!view}
                  onClick={() => zoomBy(1 / ZOOM_STEP)}>−</button>
        </div>
      </div>

      {tooltip && (
        <ChartTooltip x={tooltip.x} y={tooltip.y} color={pointColor}>
          {tooltip.content}
        </ChartTooltip>
      )}
    </div>
  );
}

export default CardDynamicsChart;