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

export default api;