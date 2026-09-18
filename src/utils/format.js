// ---------- Форматирование дат, чисел и названий срезов для карточек тренда/события ----------
function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

export function fmtDate(isoString) {
  const d = new Date(isoString);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function fmtShortDate(isoString) {
  const d = new Date(isoString);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
}

export function fmtPct(value) {
  return `${Math.round(value)}%`;
}

// стрелка + модуль числа — направление и так задаёт цвет всей карточки,
// повторный знак ("+"/"-") избыточен рядом со стрелкой
export function fmtArrow(direction, signedNumber, unit) {
  const arrow = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '';
  return `${arrow ? arrow + ' ' : ''}${Math.abs(signedNumber).toFixed(1)}${unit}`;
}

// ---------- Человекочитаемое имя подкатегории: без "слой N", код пола — по-русски ----------
const GENDER_LABELS = {
  f: 'девочки',
  m: 'мальчики',
  b: 'малыши',
  baby: 'малыши',
};

const LEVEL_KEY_PATTERN = /^(.+) \((f|m|b|baby|u), слой \d+\)$/;

export function fmtLevelKey(levelKey) {
  const match = levelKey.match(LEVEL_KEY_PATTERN);
  if (!match) return levelKey;
  const [, title, genderCode] = match;
  const genderLabel = GENDER_LABELS[genderCode];
  return genderLabel ? `${title}, ${genderLabel}` : levelKey;
}

const MONTHS_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];

export function fmtDateWithMonthWord(isoString) {
  const d = new Date(isoString);
  const year = String(d.getFullYear()).slice(-2);
  return `${pad2(d.getDate())} ${MONTHS_SHORT[d.getMonth()]} ${year}`;
}

export function fmtDateTimeShort(isoString) {
  const d = new Date(isoString);
  const year = String(d.getFullYear()).slice(-2);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${year} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}