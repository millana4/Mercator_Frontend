// ---------- Страница дашборда: настройки + блоки аналитики — график и участники на шагах 10–11 ----------
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Header from '../../components/header/Header';
import EmptyDashboardBanner from '../../components/empty_dashboard_banner/EmptyDashboardBanner';
import DashboardControls from '../../components/dashboard_controls/DashboardControls';
import AnalyticsBlock from '../../components/analytics_block/AnalyticsBlock';
import { CATEGORY_LABELS } from '../../constants/labels';
import { selectIsLoggedIn } from '../../store/slices/authSlice';
import { fetchSubscriptions } from '../../store/slices/settingsSlice';

function DashboardPage() {
  const dispatch = useDispatch();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const savedSets = useSelector((s) => s.settings.savedSets);
  const category = useSelector((s) => s.dashboard.category);

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
      {hasAccess && (
        <>
          <DashboardControls />
          {category && (
            <>
              <AnalyticsBlock
                level="category"
                headerLabel="Категория"
                fixedLevelKey={category}
                fixedLevelKeyLabel={CATEGORY_LABELS[category] || category}
              />
              <AnalyticsBlock level="subcategory" headerLabel="Подкатегория" />
              <AnalyticsBlock level="item" headerLabel="Товарная ниша" />
            </>
          )}
        </>
      )}
    </div>
  );
}

export default DashboardPage;