// ---------- Всплывающая подсказка на графике — следует за курсором, цвет как у линии/точки ----------
import styles from './ChartTooltip.module.css';

function ChartTooltip({ x, y, color, children }) {
  const resolvedColor = color.startsWith('--') ? `var(${color})` : color;
  return (
    <div className={styles.tooltip} style={{ left: x + 14, top: y + 14, color: resolvedColor }}>
      {children}
    </div>
  );
}

export default ChartTooltip;