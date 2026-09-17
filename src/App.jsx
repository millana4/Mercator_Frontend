// ---------- Роутинг: Дашборд (/) и Настройки (/settings) ----------
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/dashboard_page/DashboardPage';
import SettingsPage from './pages/settings_page/SettingsPage';
import './App.css';

function App() {
  const theme = useSelector((state) => state.theme.value);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;