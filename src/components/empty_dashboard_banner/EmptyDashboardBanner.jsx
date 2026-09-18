// ---------- Плашка "Для начала работы создайте настройки для дашборда" ----------
import { useNavigate } from 'react-router-dom';
import styles from './EmptyDashboardBanner.module.css';

function EmptyDashboardBanner() {
  const navigate = useNavigate();

  return (
    <div className={styles.banner}>
      <p>Для начала работы создайте настройки для дашборда.</p>
      <button className={styles.btnPrimary} onClick={() => navigate('/settings')}>
        Настроить
      </button>
    </div>
  );
}

export default EmptyDashboardBanner;