// ---------- HTTP-клиент: axios с базовым URL и подстановкой JWT-токена ----------
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8020/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = (username, password) =>
  api.post('/auth/login', { username, password }).then((res) => res.data);

export const getMe = () => api.get('/auth/me').then((res) => res.data);

export const getCatalog = () => api.get('/catalog').then((res) => res.data);

export const getSubscriptions = () => api.get('/subscriptions').then((res) => res.data);

export const putSubscriptions = (rows) =>
  api.put('/subscriptions', rows).then((res) => res.data);

export const getLevels = (params) => api.get('/levels', { params }).then((res) => res.data);

export const getSnapshot = (params) => api.get('/snapshot', { params }).then((res) => res.data);

// ряд повторяемости поисковой выдачи: { ready, points: [{ run_at, prev_run, repeat_pct, alert, ... }] }
export const getSearchDynamics = (params) =>
  api.get('/search-dynamics', { params }).then((res) => res.data);

export const getEventParticipants = (eventId) =>
  api.get(`/events/${eventId}/participants`).then((res) => res.data);

// ---------- Признаки товаров-маячков (рекомендации по закупкам) ----------
// страты активного сета с готовым анализом: { ready, strata: [{ stratum_id, label, n_cards, clusters }] };
// params: { category, marketplace, geo }
export const getProdSpecsStrata = (params) =>
  api.get('/prod_specs/strata', { params }).then((res) => res.data);

// анализ страты: кластеры (описание, типичные признаки, признаки с частотами, карточки)
// и карточки «прочее»
export const getProdSpecsStratum = (stratumId) =>
  api.get(`/prod_specs/strata/${stratumId}`).then((res) => res.data);

function toNaiveIso(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export const getCardMeasurements = (sku, dateFrom, dateTo) =>
  api.get(`/cards/${sku}/measurements`, {
    params: { date_from: toNaiveIso(dateFrom), date_to: toNaiveIso(dateTo) },
  }).then((res) => res.data);

  
// ---------- Товарные ниши ----------
export const getNiches = (params) => api.get('/niches', { params }).then((res) => res.data);

export const getNicheLimits = () => api.get('/niches/limits').then((res) => res.data);

// payload: { category, marketplace, geo, description, reference_url }
export const createNiche = (payload) => api.post('/niches', payload).then((res) => res.data);

export const deleteNiche = (id) => api.delete(`/niches/${id}`).then((res) => res.data);

// ниши с готовым результатом для блока «Товарная ниша»; params: { category, marketplace, geo }
export const getDashboardNiches = (params) =>
  api.get('/niches/dashboard', { params }).then((res) => res.data);

// до 30 самых близких активных карточек ниши, по убыванию близости
export const getNicheAnalogs = (id) =>
  api.get(`/niches/${id}/analogs`).then((res) => res.data);

// ---------- Управление сетами (только администратор; шлюз аналитики -> ядро) ----------
// Правки черновика возвращают задание черновика с пересчитанными количествами.
export const getAdminOverview = (params) =>
  api.get('/admin/overview', { params }).then((res) => res.data);

export const getAdminSet = (id) => api.get(`/admin/sets/${id}`).then((res) => res.data);

export const createAdminDraft = (activeSetId) =>
  api.post(`/admin/sets/${activeSetId}/draft`).then((res) => res.data);

export const patchAdminDraft = (id, body) =>
  api.patch(`/admin/drafts/${id}`, body).then((res) => res.data);

export const addAdminSubcategory = (id, body) =>
  api.post(`/admin/drafts/${id}/subcategories`, body).then((res) => res.data);

export const patchAdminSubcategory = (id, subId, body) =>
  api.patch(`/admin/drafts/${id}/subcategories/${subId}`, body).then((res) => res.data);

export const deleteAdminSubcategory = (id, subId) =>
  api.delete(`/admin/drafts/${id}/subcategories/${subId}`).then((res) => res.data);

export const addAdminStratum = (id, subId, body) =>
  api.post(`/admin/drafts/${id}/subcategories/${subId}/strata`, body).then((res) => res.data);

export const patchAdminStratum = (id, stratumId, body) =>
  api.patch(`/admin/drafts/${id}/strata/${stratumId}`, body).then((res) => res.data);

export const deleteAdminStratum = (id, stratumId) =>
  api.delete(`/admin/drafts/${id}/strata/${stratumId}`).then((res) => res.data);

export const startAdminCollecting = (id) =>
  api.post(`/admin/drafts/${id}/start`).then((res) => res.data);

export const deleteAdminDraft = (id) => api.delete(`/admin/drafts/${id}`).then((res) => res.data);

export default api;