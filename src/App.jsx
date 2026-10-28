// ---------- Роутинг: Дашборд (/) и Настройки (/settings) ----------
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/dashboard_page/DashboardPage';
import SettingsPage from './pages/settings_page/SettingsPage';
import AdminPage from './pages/admin_page/AdminPage';
import { restoreSession } from './store/slices/authSlice';
import './App.css';

function App() {
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.theme.value);
  const token = useSelector((state) => state.auth.token);
  const username = useSelector((state) => state.auth.username);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Токен сохранился с прошлого раза, а имени нет - восстанавливаем сессию
  useEffect(() => {
    if (token && !username) dispatch(restoreSession());
  }, [token, username, dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;