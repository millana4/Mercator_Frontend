// ---------- Страница дашборда: настройки + блоки аналитики категории, подкатегории и товарной ниши ----------
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Header from '../../components/header/Header';
import EmptyDashboardBanner from '../../components/empty_dashboard_banner/EmptyDashboardBanner';
import DashboardControls from '../../components/dashboard_controls/DashboardControls';
import AnalyticsBlock from '../../components/analytics_block/AnalyticsBlock';
import NicheDetails from '../../components/niche_details/NicheDetails';
import SearchDynamicsBlock from '../../components/search_dynamics_block/SearchDynamicsBlock';
import {
  CATEGORY_LABELS, NICHE_DETAILS_LABELS, NICHE_PENDING_ANALYTICS_TEXT,
} from '../../constants/labels';
import { getDashboardNiches } from '../../services/api';
import { selectIsLoggedIn } from '../../store/slices/authSlice';
import { selectDashboardCombos } from '../../store/slices/dashboardSlice';
import { fetchCatalog, fetchSubscriptions } from '../../store/slices/settingsSlice';
import { capitalize } from '../../utils/text';


// Ниши с готовым результатом, видимые пользователю. Подпись - запрос нейросети,
// пока его нет - описание или ссылка. Объявлен вне компонента: ссылка постоянная.
const loadNicheOptions = ({ category, marketplace, geo }) =>
  getDashboardNiches({ category, marketplace, geo }).then((niches) => niches.map((n) => ({
    value: n.id,
    label: capitalize(n.search_query || n.description) || n.reference_url,
    niche: n,
    ready: n.ready,   // false - расчёта ещё нет, в блоке заглушка вместо аналитики
  })));

function DashboardPage() {
  const dispatch = useDispatch();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const isAdmin = useSelector((s) => s.auth.isAdmin);
  // связки дашборда: у администратора - весь каталог, у пользователя - подписки
  const combos = useSelector(selectDashboardCombos);
  const category = useSelector((s) => s.dashboard.category);

  useEffect(() => {
    if (!isLoggedIn) return;
    dispatch(isAdmin ? fetchCatalog() : fetchSubscriptions());
  }, [isLoggedIn, isAdmin, dispatch]);

  const hasAccess = isLoggedIn && combos.length > 0;

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
              <AnalyticsBlock
                level="niche"
                headerLabel="Товарная ниша"
                loadOptions={loadNicheOptions}
                detailsLabels={NICHE_DETAILS_LABELS}
                pendingText={NICHE_PENDING_ANALYTICS_TEXT}
                renderDetails={(option, periodRange) => (
                  <NicheDetails niche={option.niche} periodRange={periodRange} />
                )}
              />
              <SearchDynamicsBlock />
            </>
          )}
        </>
      )}
    </div>
  );
}

export default DashboardPage;