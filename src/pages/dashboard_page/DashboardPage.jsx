// ---------- Страница дашборда: настройки + блоки аналитики категории, подкатегории и товарной ниши ----------
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Header from '../../components/header/Header';
import EmptyDashboardBanner from '../../components/empty_dashboard_banner/EmptyDashboardBanner';
import DashboardControls from '../../components/dashboard_controls/DashboardControls';
import AnalyticsBlock from '../../components/analytics_block/AnalyticsBlock';
import NicheDetails from '../../components/niche_details/NicheDetails';
import { CATEGORY_LABELS, NICHE_DETAILS_LABELS } from '../../constants/labels';
import { getDashboardNiches } from '../../services/api';
import { selectIsLoggedIn } from '../../store/slices/authSlice';
import { fetchSubscriptions } from '../../store/slices/settingsSlice';

// Первая буква заглавная: запрос нейросети приходит строчными
const capitalize = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

// Ниши с готовым результатом, видимые пользователю. Подпись - запрос нейросети,
// пока его нет - описание или ссылка. Объявлен вне компонента: ссылка постоянная.
const loadNicheOptions = ({ category, marketplace, geo }) =>
  getDashboardNiches({ category, marketplace, geo }).then((niches) => niches.map((n) => ({
    value: n.id,
    label: capitalize(n.search_query || n.description) || n.reference_url,
    niche: n,
  })));

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
              <AnalyticsBlock
                level="niche"
                headerLabel="Товарная ниша"
                loadOptions={loadNicheOptions}
                detailsLabels={NICHE_DETAILS_LABELS}
                renderDetails={(option) => <NicheDetails niche={option.niche} />}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

export default DashboardPage;