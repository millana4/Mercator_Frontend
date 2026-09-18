// ---------- Всплывающая подсказка на графике — следует за курсором, цвет как у линии/точки ----------
import styles from './ChartTooltip.module.css';

function ChartTooltip({ x, y, color, children }) {
  return (
    <div className={styles.tooltip} style={{ left: x + 14, top: y + 14, color: `var(${color})` }}>
      {children}
    </div>
  );
}

export default ChartTooltip;