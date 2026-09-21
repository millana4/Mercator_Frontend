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

export const getEventParticipants = (eventId) =>
  api.get(`/events/${eventId}/participants`).then((res) => res.data);

function toNaiveIso(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export const getCardMeasurements = (sku, dateFrom, dateTo) =>
  api.get(`/cards/${sku}/measurements`, {
    params: { date_from: toNaiveIso(dateFrom), date_to: toNaiveIso(dateTo) },
  }).then((res) => res.data);

export default api;