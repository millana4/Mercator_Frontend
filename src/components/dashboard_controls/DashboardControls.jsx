// ---------- Настройки дашборда: категория/маркетплейс/гео (подписки; у администратора - каталог) + период ----------
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CATEGORY_LABELS, MARKETPLACE_LABELS, PERIOD_LABELS } from '../../constants/labels';
import {
  selectDashboardCombos, setSelection, setPeriod, setCustomRange,
} from '../../store/slices/dashboardSlice';
import Dropdown from '../dropdown/Dropdown';
import styles from './DashboardControls.module.css';

const PERIODS = ['month', 'halfyear', 'year', 'custom'];

const uniqueBy = (rows, filterFn, field) => [...new Set(rows.filter(filterFn).map((r) => r[field]))];

function toOptions(values, labels) {
  return values.map((v) => ({ value: v, label: labels[v] || v }));
}

function DashboardControls() {
  const dispatch = useDispatch();
  // связки: у пользователя - подписки, у администратора - весь каталог
  const savedSets = useSelector(selectDashboardCombos);
  const { category, marketplace, geo, period, customFrom, customTo } = useSelector(
    (s) => s.dashboard,
  );

  const categories = [...new Set(savedSets.map((s) => s.category))];
  const marketplaces = uniqueBy(savedSets, (s) => s.category === category, 'marketplace');
  const geos = uniqueBy(
    savedSets, (s) => s.category === category && s.marketplace === marketplace, 'geo',
  );

  // Выбор восстановлен с прошлого раза или ещё пуст. Оставляем его, если такая связка
  // есть в подписках; иначе - та же категория с доступными маркетплейсом и гео,
  // а если и категории нет (подписку удалили) - первая подписка.
  useEffect(() => {
    if (categories.length === 0) return;
    const comboExists = savedSets.some(
      (s) => s.category === category && s.marketplace === marketplace && s.geo === geo,
    );
    if (comboExists) return;

    const targetCategory = category && categories.includes(category) ? category : categories[0];
    const mpOptions = uniqueBy(savedSets, (s) => s.category === targetCategory, 'marketplace');
    const targetMarketplace = mpOptions.includes(marketplace) ? marketplace : mpOptions[0];
    const geoOptions = uniqueBy(
      savedSets,
      (s) => s.category === targetCategory && s.marketplace === targetMarketplace,
      'geo',
    );
    const targetGeo = geoOptions.includes(geo) ? geo : geoOptions[0];
    dispatch(setSelection({ category: targetCategory, marketplace: targetMarketplace, geo: targetGeo }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSets]);

  const handleCategoryChange = (value) => {
    const mpOptions = uniqueBy(savedSets, (s) => s.category === value, 'marketplace');
    const newMarketplace = mpOptions.length === 1 ? mpOptions[0] : '';
    const geoOptions = newMarketplace
      ? uniqueBy(savedSets, (s) => s.category === value && s.marketplace === newMarketplace, 'geo')
      : [];
    dispatch(setSelection({
      category: value, marketplace: newMarketplace,
      geo: geoOptions.length === 1 ? geoOptions[0] : '',
    }));
  };

  const handleMarketplaceChange = (value) => {
    const geoOptions = uniqueBy(savedSets, (s) => s.category === category && s.marketplace === value, 'geo');
    dispatch(setSelection({
      category, marketplace: value, geo: geoOptions.length === 1 ? geoOptions[0] : '',
    }));
  };

  const handleGeoChange = (value) => {
    dispatch(setSelection({ category, marketplace, geo: value }));
  };

  const handlePeriodClick = (value) => {
    if (value === 'custom' && (!customFrom || !customTo)) {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 30);
      const iso = (d) => d.toISOString().slice(0, 10);
      dispatch(setCustomRange({ from: iso(from), to: iso(to) }));
    }
    dispatch(setPeriod(value));
  };

  return (
    <div className={styles.bar}>
      <div className={styles.fieldGroup}>
        <span className={styles.label}>Категория</span>
        <Dropdown
          value={category}
          options={toOptions(categories, CATEGORY_LABELS)}
          onChange={handleCategoryChange}
        />
      </div>

      <div className={styles.fieldGroup}>
        <span className={styles.label}>Маркетплейс</span>
        <Dropdown
          value={marketplace}
          options={toOptions(marketplaces, MARKETPLACE_LABELS)}
          onChange={handleMarketplaceChange}
        />
      </div>

      <div className={styles.fieldGroup}>
        <span className={styles.label}>Гео</span>
        <Dropdown
          value={geo}
          options={toOptions(geos, {})}
          onChange={handleGeoChange}
        />
      </div>

      <div className={styles.periodGroup}>
        {PERIODS.map((p) => (
          <button
            key={p}
            className={`${styles.segBtn} ${period === p ? styles.active : ''}`}
            onClick={() => handlePeriodClick(p)}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
        {period === 'custom' && (
          <>
            <span className={styles.label}>с</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => dispatch(setCustomRange({ from: e.target.value, to: customTo }))}
            />
            <span className={styles.label}>по</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => dispatch(setCustomRange({ from: customFrom, to: e.target.value }))}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default DashboardControls;