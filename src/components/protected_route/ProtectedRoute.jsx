// ---------- Гейт для страниц, доступных только залогиненным ----------
import { useSelector } from 'react-redux';
import { selectIsLoggedIn } from '../../store/slices/authSlice';

function ProtectedRoute({ children }) {
  const isLoggedIn = useSelector(selectIsLoggedIn);

  if (!isLoggedIn) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Эта страница доступна только после входа. Нажмите «Войти» в шапке.</p>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;