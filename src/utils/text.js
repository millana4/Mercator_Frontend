// ---------- Работа с текстом подписей ----------

// Первая буква заглавная: запрос нейросети приходит строчными
export const capitalize = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);