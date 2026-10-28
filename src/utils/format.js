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


// ---------- Анализ поисковой выдачи ----------
const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];   // getDay(): 0 - воскресенье

const fmtDec1 = (value) => value.toFixed(1).replace('.', ',');

// «21 окт ср 18:37» - подпись снимка выдачи
export function fmtRunLabel(isoString) {
  const d = new Date(isoString);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${WEEKDAYS_SHORT[d.getDay()]} `
    + `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// «21 окт» и «ср» - подпись суток на оси (дата в мс или строкой)
export function fmtDayMonth(value) {
  const d = new Date(value);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
}

export function fmtWeekday(value) {
  return WEEKDAYS_SHORT[new Date(value).getDay()];
}

// «46,5» и «46,5%»
export const fmtNum1 = (value) => fmtDec1(value);
export const fmtPct1 = (value) => `${fmtDec1(value)}%`;

// «+7°» над графиком, «6,8°C» и «0,4 мм» в подсказке
export function fmtTempShort(value) {
  const r = Math.round(value);
  return `${r > 0 ? '+' : ''}${r}°`;
}
export const fmtTemp = (value) => `${fmtDec1(value)}°C`;
export const fmtPrecip = (value) => `${fmtDec1(value)} мм`;


// «17.10 сб» - день снимка выдачи, без времени
export function fmtRunDay(isoString) {
  const d = new Date(isoString);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)} ${WEEKDAYS_SHORT[d.getDay()]}`;
}


// ---------- Управление сетами ----------
// доли задания: полностью, как сохранены, с десятичной запятой; пусто - пустая строка
export const fmtShare = (value) => (value === null || value === undefined ? ''
  : String(value).replace('.', ','));

// расчётные колонки задания: до 2 знаков
export const fmtFigure = (value) => (value === null || value === undefined ? ''
  : Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 }));


// поле числа в черновике: допустимый промежуточный ввод (цифры, у дробных - одна запятая или точка)
export const isNumberDraft = (kind, text) =>
  (kind === 'int' ? /^\d*$/ : /^\d*([.,]\d*)?$/).test(text);