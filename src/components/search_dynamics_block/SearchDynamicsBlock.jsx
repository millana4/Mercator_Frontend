// ---------- Блок «Анализ поисковой выдачи»: показывается, только если ряд повторяемости посчитан ----------
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { getSearchDynamics } from '../../services/api';
import { getPeriodRange } from '../../utils/analytics';
import { SEARCH_DYNAMICS_LABELS } from '../../constants/labels';
import SearchDynamicsChart from '../search_dynamics_chart/SearchDynamicsChart';
import styles from './SearchDynamicsBlock.module.css';

function SearchDynamicsBlock() {
  const { category, marketplace, geo, period, customFrom, customTo } = useSelector((s) => s.dashboard);

  // Ответ хранится вместе с ключом связки: при смене связки старый ответ
  // не совпадает по ключу и считается сброшенным - без setState внутри эффекта.
  const requestKey = `${category}|${marketplace}|${geo}`;
  const [loaded, setLoaded] = useState({ key: null, data: null });

  useEffect(() => {
    if (!category || !marketplace || !geo) return;
    let cancelled = false;
    getSearchDynamics({ category, marketplace, geo })
      .then((data) => { if (!cancelled) setLoaded({ key: requestKey, data }); })
      .catch(() => { if (!cancelled) setLoaded({ key: requestKey, data: null }); });
    return () => { cancelled = true; };
  }, [category, marketplace, geo, requestKey]);

  const data = loaded.key === requestKey ? loaded.data : null;
  const ready = Boolean(data && data.ready && data.points.length > 0);

  // Период - общий с дашбордом; конец периода - последний снимок ряда
  const periodRange = useMemo(() => {
    if (!ready) return null;
    return getPeriodRange(period, customFrom, customTo,
      data.points.map((p) => ({ parsed_at: p.run_at })));
  }, [ready, data, period, customFrom, customTo]);

  // Ряд не посчитан или ещё не загружен - блок не показывается
  if (!ready || !periodRange) return null;

  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>{SEARCH_DYNAMICS_LABELS.header}</span>
      </div>
      <SearchDynamicsChart points={data.points} weather={data.weather || []}
        periodFrom={periodRange.from} periodTo={periodRange.to} />
    </div>
  );
}

export default SearchDynamicsBlock;