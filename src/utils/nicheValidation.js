// ---------- Проверка ссылки на референс: те же правила, что в app/niches/validation.py ----------
import { MARKETPLACE_LABELS } from '../constants/labels';

const MARKETPLACE_DOMAINS = { ozon: ['ozon.ru'] };
const PRODUCT_PATHS = { ozon: /^\/product\/(?:[^/]*-)?\d+\/?$/ };
const BAD_URL = 'Некорректная ссылка: нужна ссылка, начинающаяся с http:// или https://';

// Возвращает текст ошибки или null, если ссылка подходит.
export function referenceUrlError(marketplace, url) {
  const mp = (marketplace || '').toLowerCase();
  const label = MARKETPLACE_LABELS[mp] || marketplace;
  const domains = MARKETPLACE_DOMAINS[mp];
  if (!domains) {
    return `Ссылки на референс для маркетплейса «${label}» пока не поддерживаются`;
  }

  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    return BAD_URL;
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
    return BAD_URL;
  }

  const host = parsed.hostname.toLowerCase();
  if (!domains.some((d) => host === d || host.endsWith(`.${d}`))) {
    return `Ссылка ведёт не на ${label}: укажите ссылку на карточку ${label} или выберите другой маркетплейс`;
  }

  const pattern = PRODUCT_PATHS[mp];
  if (pattern && !pattern.test(parsed.pathname)) {
    return 'Ссылка не на карточку товара: нужна полная ссылка вида https://www.ozon.ru/product/...-<артикул>/';
  }
  return null;
}