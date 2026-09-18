// ---------- ВРЕМЕННАЯ форма логина — вопрос SSO ещё не решён, заменится по спецификации ----------
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { login, getMe } from '../../services/api';
import { setCredentials } from '../../store/slices/authSlice';
import styles from './TempLoginForm.module.css';

function TempLoginForm({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const { access_token } = await login(username, password);
      localStorage.setItem('token', access_token);
      const me = await getMe();
      dispatch(setCredentials({ token: access_token, username: me.username }));
      onSuccess();
    } catch {
      setError('Неверный логин или пароль');
    }
  };

  return (
    <form className={styles.panel} onSubmit={handleSubmit}>
      <label className={styles.field}>
        Логин
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
      </label>
      <label className={styles.field}>
        Пароль
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className={styles.error}>{error}</p>}
      <button type="submit" className={styles.submit}>
        Войти
      </button>
    </form>
  );
}

export default TempLoginForm;