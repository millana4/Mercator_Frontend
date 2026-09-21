// ---------- График цены одной карточки в рублях — реальные замеры в границах периода дашборда ----------
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { getCardMeasurements } from '../../services/api';
import { fmtDateWithMonthWord, fmtDateTimeShort } from '../../utils/format';
import ChartTooltip from '../chart_tooltip/ChartTooltip';
import styles from './CardDynamicsChart.module.css';

const W = 660;
const H = 250;
const PAD_L = 46;
const PAD_R = 14;
const PAD_T = 20;
const PAD_B = 28;
const OUT_OF_STOCK_GAP = 20; // отступ от низа графика цен до пунктирной линии
const AXIS_GAP = 30;         // отступ от пунктирной линии (или от низа графика, если её нет) до подписей дат
const DATE_TICKS = 7;
const LINE_COLOR = '#7b03fc';

function CardDynamicsChart({ sku, name, periodFrom, periodTo }) {
  const theme = useSelector((s) => s.theme.value);
  const pointColor = theme === 'dark' ? '#bd80ff' : '#7b03fc';

  const [allPoints, setAllPoints] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!periodFrom || !periodTo) return;
    const requestId = ++requestIdRef.current;
    setTooltip(null);
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

  const withPrice = allPoints.filter((p) => p.price !== null);
  if (withPrice.length < 2) {
    return <p className={styles.muted}>Недостаточно замеров с ценой для графика.</p>;
  }

  const hasOutOfStock = allPoints.some((p) => p.price === null);

  const n = allPoints.length;
  const values = withPrice.map((p) => p.price);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const spanV = (maxV - minV) || 1;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const x = (i) => PAD_L + (i / (n - 1)) * plotW;
  const yForPrice = (v) => PAD_T + plotH - ((v - minV) / spanV) * plotH;

  const priceAreaBottom = PAD_T + plotH;
  const outOfStockY = priceAreaBottom + OUT_OF_STOCK_GAP;
  const dateAxisY = (hasOutOfStock ? outOfStockY : priceAreaBottom) + AXIS_GAP;
  const svgHeight = dateAxisY + 6;

  let d = '';
  let started = false;
  allPoints.forEach((p, i) => {
    if (p.price === null) { started = false; return; }
    d += `${!started ? 'M' : 'L'} ${x(i).toFixed(1)} ${yForPrice(p.price).toFixed(1)} `;
    started = true;
  });

  return (
    <div
      className={styles.wrap}
      onMouseMove={(e) => {
        if (tooltip) setTooltip((t) => t && { ...t, x: e.clientX, y: e.clientY });
      }}
    >
      <p className={styles.title}>Динамика цены за выбранный период: {name}</p>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${W} ${svgHeight}`}
        preserveAspectRatio="none"
      >
        {[minV, (minV + maxV) / 2, maxV].map((v, idx) => (
          <g key={idx}>
            <line x1={PAD_L} y1={yForPrice(v)} x2={W - PAD_R} y2={yForPrice(v)} stroke="var(--border)" strokeWidth="1" />
            <text x={PAD_L - 8} y={yForPrice(v) + 3} textAnchor="end" className={styles.axisLabel}>
              {Math.round(v).toLocaleString('ru-RU')} ₽
            </text>
          </g>
        ))}

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

        {Array.from({ length: DATE_TICKS }, (_, k) => k).map((k) => {
          const idx = Math.round((k * (n - 1)) / (DATE_TICKS - 1));
          return (
            <text key={k} x={x(idx)} y={dateAxisY} textAnchor="middle" className={styles.axisLabel}>
              {fmtDateWithMonthWord(allPoints[idx].parsed_at)}
            </text>
          );
        })}

        <path d={d} fill="none" stroke={LINE_COLOR} strokeWidth="1.4" />

        {allPoints.map((p, i) => {
          if (p.price === null) {
            return (
              <circle
                key={i}
                cx={x(i)}
                cy={outOfStockY}
                r="2.8"
                fill="var(--text-muted)"
                stroke="var(--bg-card)"
                strokeWidth="0.75"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => setTooltip({
                  x: e.clientX,
                  y: e.clientY,
                  content: (
                    <>
                      <div><b>{fmtDateTimeShort(p.parsed_at)}</b></div>
                      <div>Не было в наличии</div>
                    </>
                  ),
                })}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          }
          return (
            <circle
              key={i}
              cx={x(i)}
              cy={yForPrice(p.price)}
              r="2.8"
              fill={pointColor}
              stroke="var(--bg-card)"
              strokeWidth="0.75"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => setTooltip({
                x: e.clientX,
                y: e.clientY,
                content: (
                  <>
                    <div><b>{fmtDateTimeShort(p.parsed_at)}</b></div>
                    <div>{Math.round(p.price).toLocaleString('ru-RU')} ₽</div>
                  </>
                ),
              })}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}
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