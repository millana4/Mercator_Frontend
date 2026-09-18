// ---------- Страница дашборда: пустое состояние — тело наполним на шагах 8–11 ----------
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Header from '../../components/header/Header';
import EmptyDashboardBanner from '../../components/empty_dashboard_banner/EmptyDashboardBanner';
import { selectIsLoggedIn } from '../../store/slices/authSlice';
import { fetchSubscriptions } from '../../store/slices/settingsSlice';

function DashboardPage() {
  const dispatch = useDispatch();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const savedSets = useSelector((s) => s.settings.savedSets);

  useEffect(() => {
    if (isLoggedIn) {
      dispatch(fetchSubscriptions());
    }
  }, [isLoggedIn, dispatch]);

  const hasAccess = isLoggedIn && savedSets.length > 0;

  return (
    <div>
      <Header />
      {!hasAccess && <EmptyDashboardBanner />}
      {hasAccess && <p>Дашборд (наполним на шагах 8–11)</p>}
    </div>
  );
}

export default DashboardPage;