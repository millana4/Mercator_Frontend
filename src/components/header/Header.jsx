// ---------- Шапка: лого, тема, Настройки (пользователь) / Управление сетами (админ) / Дашборд, Войти/Выйти ----------
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { setTheme } from '../../store/slices/themeSlice';
import { logOut, selectIsLoggedIn } from '../../store/slices/authSlice';
import { ADMIN_LABELS } from '../../constants/labels';
import TempLoginForm from './TempLoginForm';
import styles from './Header.module.css';

function Header() {
  const theme = useSelector((state) => state.theme.value);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const isAdmin = useSelector((state) => state.auth.isAdmin);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLoginForm, setShowLoginForm] = useState(false);

  // на странице настроек и управления сетами - возврат на дашборд
  const isSecondaryPage = location.pathname === '/settings' || location.pathname === '/admin';

  return (
    <div className={styles.headerWrap}>
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

          {isSecondaryPage && (
            <button className={styles.btnSecondary} onClick={() => navigate('/')}>
              Дашборд
            </button>
          )}
          {!isSecondaryPage && isAdmin && (
            <button className={styles.btnSecondary} onClick={() => navigate('/admin')}>
              {ADMIN_LABELS.navButton}
            </button>
          )}
          {!isSecondaryPage && !isAdmin && (
            <button className={styles.btnSecondary} onClick={() => navigate('/settings')}>
              Настройки
            </button>
          )}

          {isLoggedIn ? (
            <button className={styles.btnSecondary} onClick={() => dispatch(logOut())}>
              Выйти
            </button>
          ) : (
            <button
              className={styles.btnPrimary}
              onClick={() => setShowLoginForm((v) => !v)}
            >
              Войти
            </button>
          )}
        </div>
      </div>

      {showLoginForm && !isLoggedIn && (
        <TempLoginForm onSuccess={() => setShowLoginForm(false)} />
      )}
    </div>
  );
}

export default Header;