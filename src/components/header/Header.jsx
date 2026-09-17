// ---------- Шапка: лого, тема, Настройки/Дашборд, Войти/Выйти ----------
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { setTheme } from '../../store/slices/themeSlice';
import { logIn, logOut } from '../../store/slices/authSlice';
import styles from './Header.module.css';

function Header() {
  const theme = useSelector((state) => state.theme.value);
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const isSettingsPage = location.pathname === '/settings';

  return (
    <div className={styles.headerBar}>
      <button className={styles.logo} onClick={() => navigate('/')}>
        Mercator
      </button>

      <div className={styles.headerRight}>
        <div className={styles.themeSwitch}>
          <button
            className={`${styles.segBtn} ${theme === 'light' ? styles.active : ''}`}
            onClick={() => dispatch(setTheme('light'))}
          >
            Светлая
          </button>
          <button
            className={`${styles.segBtn} ${theme === 'dark' ? styles.active : ''}`}
            onClick={() => dispatch(setTheme('dark'))}
          >
            Тёмная
          </button>
        </div>

        {isSettingsPage ? (
          <button className={styles.btnSecondary} onClick={() => navigate('/')}>
            Дашборд
          </button>
        ) : (
          <button className={styles.btnSecondary} onClick={() => navigate('/settings')}>
            Настройки
          </button>
        )}

        {isLoggedIn ? (
          <button className={styles.btnSecondary} onClick={() => dispatch(logOut())}>
            Выйти
          </button>
        ) : (
          <button className={styles.btnPrimary} onClick={() => dispatch(logIn())}>
            Войти
          </button>
        )}
      </div>
    </div>
  );
}

export default Header;