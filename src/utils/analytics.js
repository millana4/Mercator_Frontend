// ---------- Определение актуального (текущего) тренда/события по снепшоту ----------
export function getCurrentEvent(events) {
  if (!events || events.length === 0) return null;
  const sorted = [...events].sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  const last = sorted[sorted.length - 1];
  return last.is_open ? last : null;
}