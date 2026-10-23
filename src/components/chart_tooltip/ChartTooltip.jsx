// ---------- Всплывающая подсказка на графике — следует за курсором, цвет как у линии/точки ----------
// У правого края окна подсказка встаёт слева от курсора, чтобы не обрезаться.
import styles from './ChartTooltip.module.css';

const OFFSET = 14;       // отступ подсказки от курсора
const MAX_WIDTH = 360;    // как max-width в ChartTooltip.module.css

function ChartTooltip({ x, y, color, children }) {
  const resolvedColor = color.startsWith('--') ? `var(${color})` : color;
  // ширина окна без полосы прокрутки - от неё отсчитывается position: fixed
  const viewportW = document.documentElement.clientWidth;
  const flipLeft = x + OFFSET + MAX_WIDTH > viewportW;
  const style = flipLeft
    ? { right: viewportW - x + OFFSET, top: y + OFFSET, color: resolvedColor }
    : { left: x + OFFSET, top: y + OFFSET, color: resolvedColor };
  return (
    <div className={styles.tooltip} style={style}>
      {children}
    </div>
  );
}

export default ChartTooltip;