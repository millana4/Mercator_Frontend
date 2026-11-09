// ---------- Плавное скрытие части блока: пауза, плавное сжатие окна, выравнивание верха ----------
// Порядок: 1) скрываемое содержимое пропадает сразу, а высота блока остаётся прежней;
// 2) после паузы высота плавно уменьшается до нужной; 3) после ещё одной паузы страница
// плавно прокручивается так, чтобы верх блока встал на верх видимой области.
// Блок - ближайший предок кнопки с атрибутом data-collapse-root (или сам элемент).
import { flushSync } from 'react-dom';

const ROOT_SELECTOR = '[data-collapse-root]';
const FREEZE_PAUSE_MS = 300;    // сколько виден пустой промежуток на месте скрытого
const SHRINK_MS = 400;          // плавное сжатие окна
const SCROLL_PAUSE_MS = 200;    // пауза перед выравниванием верха блока
const SCROLL_TOP_GAP_PX = 0;    // отступ верха блока от верха видимой области

const running = new WeakMap();  // блок -> таймеры незавершённого скрытия

function releaseStyles(root) {
  root.style.height = '';
  root.style.overflow = '';
  root.style.transition = '';
  root.style.boxSizing = '';
}

function cancel(root) {
  const timers = running.get(root);
  if (timers) {
    timers.forEach(clearTimeout);
    running.delete(root);
  }
  releaseStyles(root);
}

function alignTop(root) {
  if (!root.isConnected) return;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const wanted = root.getBoundingClientRect().top + window.scrollY - SCROLL_TOP_GAP_PX;
  const top = Math.max(0, Math.min(wanted, maxScroll));
  if (Math.abs(top - window.scrollY) > 1) window.scrollTo({ top, behavior: 'smooth' });
}

// element - кнопка или любой элемент внутри блока; mutate - то, что скрывает содержимое
// (setState). Нет блока с data-collapse-root - содержимое скрывается без анимации.
export function collapseSmoothly(element, mutate) {
  const root = element ? element.closest(ROOT_SELECTOR) : null;
  if (!root) {
    mutate();
    return;
  }
  cancel(root);

  // 1. Высота блока замораживается, содержимое скрывается сразу
  const startHeight = root.getBoundingClientRect().height;
  root.style.boxSizing = 'border-box';
  root.style.height = `${startHeight}px`;
  root.style.overflow = 'hidden';
  flushSync(mutate);

  // Нужная высота: измеряется без отрисовки между измерением и возвратом замороженной
  root.style.height = 'auto';
  const targetHeight = root.getBoundingClientRect().height;
  if (targetHeight >= startHeight - 1) {
    releaseStyles(root);
    return;
  }
  root.style.height = `${startHeight}px`;

  const timers = [];
  running.set(root, timers);
  // 2. Плавное сжатие окна
  timers.push(setTimeout(() => {
    root.style.transition = `height ${SHRINK_MS}ms ease`;
    root.style.height = `${targetHeight}px`;
  }, FREEZE_PAUSE_MS));
  timers.push(setTimeout(() => releaseStyles(root), FREEZE_PAUSE_MS + SHRINK_MS));
  // 3. Верх блока - на верх видимой области
  timers.push(setTimeout(() => {
    running.delete(root);
    alignTop(root);
  }, FREEZE_PAUSE_MS + SHRINK_MS + SCROLL_PAUSE_MS));
}