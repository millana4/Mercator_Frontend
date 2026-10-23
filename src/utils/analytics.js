// ---------- Определение актуального тренда/события и подготовка данных для графика ----------
import { fmtDate } from './format';

export function getCurrentEvent(events) {
  if (!events || events.length === 0) return null;
  return events.find((e) => e.is_open) || null;
}

// Границы периода для графика. /snapshot отдаёт всю историю целиком —
// период отрезает нужный кусок уже на фронте, бэкенд про период не знает.
export function getPeriodRange(period, customFrom, customTo, curve) {
  if (period === 'custom') {
    const to = new Date(customTo);
    to.setHours(23, 59, 59, 999);
    return { from: new Date(customFrom), to };
  }
  const days = { month: 30, halfyear: 182, year: 365 }[period] || 30;
  const lastDate = curve.length > 0 ? new Date(curve[curve.length - 1].parsed_at) : new Date();
  const from = new Date(lastDate);
  from.setDate(from.getDate() - days);
  return { from, to: lastDate };
}

// Границы периода для графиков цены карточек: начало - как у периода дашборда,
// правая граница - текущий момент, чтобы были видны замеры после последней точки
// снепшота. Произвольный период пользователь задал сам - он остаётся как есть.
export function getCardPeriodRange(periodRange, period) {
  if (!periodRange) return null;
  if (period === 'custom') return periodRange;
  return { from: periodRange.from, to: new Date() };
}

// Красит каждую точку кривой в направление того события EWMA, в чьё окно
// [start_at, end_at] она попадает — вне любого окна точка серая ("none").
export function assignEventToPoints(curve, events) {
  return curve.map((p) => {
    const t = new Date(p.parsed_at).getTime();
    const match = events.find((e) => {
      const s = new Date(e.start_at).getTime();
      const en = new Date(e.end_at).getTime();
      return t >= s && t <= en;
    });
    return { ...p, direction: match ? match.direction : 'none', event: match || null };
  });
}

// Склеивает подряд идущие точки с одним и тем же событием в один отрезок —
// для сплошной цветной линии и одной зоны наведения на весь отрезок.
export function buildRuns(points) {
  const runs = [];
  let i = 0;
  while (i < points.length) {
    let j = i;
    while (
      j + 1 < points.length &&
      points[j + 1].direction === points[i].direction &&
      points[j + 1].event === points[i].event
    ) {
      j++;
    }
    runs.push({ from: i > 0 ? i - 1 : i, to: j, direction: points[i].direction, event: points[i].event });
    i = j + 1;
  }
  return runs;
}

// ---------- Заголовок списка участников: тип + направление + диапазон дат ----------
const PARTICIPANTS_TITLES = {
  'trend-down': 'Карточки-участники тренда на снижение цен',
  'trend-up': 'Карточки-участники тренда на повышение цен',
  'event-down': 'Карточки-участники события снижения цен',
  'event-up': 'Карточки-участники события роста цен',
};

export function getParticipantsTitle(kind, event) {
  const base = PARTICIPANTS_TITLES[`${kind}-${event.direction}`] || '';
  const range = event.is_open
    ? `${fmtDate(event.start_at)} – по настоящее время`
    : `${fmtDate(event.start_at)} – ${fmtDate(event.end_at)}`;
  return `${base} ${range}`;
}