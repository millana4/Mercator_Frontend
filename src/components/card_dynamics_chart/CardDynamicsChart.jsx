// ---------- График цены одной карточки в рублях — реальные замеры за последние 30 суток ----------
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
const LINE_COLOR = '#7b03fc';

function CardDynamicsChart({ sku, name }) {
  const theme = useSelector((s) => s.theme.value);
  const pointColor = theme === 'dark' ? '#bd80ff' : '#7b03fc';

  const [points, setPoints] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setTooltip(null);
    // points не сбрасываем в null здесь намеренно — старый график остаётся
    // на экране, пока не придут новые данные, чтобы высота блока не скакала
    // между "Загрузка..." и графиком при переключении карточек.
    getCardMeasurements(sku, 30)
      .then((data) => {
        if (requestIdRef.current !== requestId) return; // ответ на устаревший запрос — игнорируем
        setPoints(data.filter((p) => p.price !== null));
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) return;
        setPoints([]);
      });
  }, [sku]);

  if (points === null) {
    return <p className={styles.muted}>Загрузка…</p>;
  }
  if (points.length < 2) {
    return <p className={styles.muted}>Недостаточно замеров для графика.</p>;
  }

  const values = points.map((p) => p.price);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const spanV = (maxV - minV) || 1;
  const n = points.length;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const x = (i) => PAD_L + (i / (n - 1)) * plotW;
  const y = (v) => PAD_T + plotH - ((v - minV) / spanV) * plotH;

  let d = '';
  points.forEach((p, i) => {
    d += `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.price).toFixed(1)} `;
  });

  return (
    <div
      className={styles.wrap}
      onMouseMove={(e) => {
        if (tooltip) setTooltip((t) => t && { ...t, x: e.clientX, y: e.clientY });
      }}
    >
      <p className={styles.title}>Динамика цены за последний месяц: {name}</p>
      <svg className={styles.svg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {[minV, (minV + maxV) / 2, maxV].map((v, idx) => (
          <g key={idx}>
            <line x1={PAD_L} y1={y(v)} x2={W - PAD_R} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
            <text x={PAD_L - 8} y={y(v) + 3} textAnchor="end" className={styles.axisLabel}>
              {Math.round(v).toLocaleString('ru-RU')} ₽
            </text>
          </g>
        ))}
        {[0, 1, 2, 3].map((k) => {
          const idx = Math.round((k * (n - 1)) / 3);
          return (
            <text key={k} x={x(idx)} y={H - 6} textAnchor="middle" className={styles.axisLabel}>
              {fmtDateWithMonthWord(points[idx].parsed_at)}
            </text>
          );
        })}
        <path d={d} fill="none" stroke={LINE_COLOR} strokeWidth="1.4" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.price)}
            r="2.8"
            fill={pointColor}
            stroke="var(--bg-card)"
            strokeWidth="1"
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