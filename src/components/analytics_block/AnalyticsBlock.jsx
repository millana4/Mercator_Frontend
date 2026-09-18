// ---------- Один блок аналитики: шапка + Тренд/Событие + место под график (шаг 10) ----------
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { getLevels, getSnapshot } from '../../services/api';
import { getCurrentEvent } from '../../utils/analytics';
import { fmtLevelKey } from '../../utils/format';
import TrendCard from '../trend_card/TrendCard';
import EventCard from '../event_card/EventCard';
import styles from './AnalyticsBlock.module.css';

function AnalyticsBlock({ level, headerLabel, fixedLevelKey, fixedLevelKeyLabel }) {
  const { category, marketplace, geo } = useSelector((s) => s.dashboard);
  const isFixed = Boolean(fixedLevelKey);

  const [availableKeys, setAvailableKeys] = useState([]);
  const [levelsLoaded, setLevelsLoaded] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [trendStatus, setTrendStatus] = useState({ state: 'loading' });
  const [eventStatus, setEventStatus] = useState({ state: 'loading' });

  const levelKey = isFixed ? fixedLevelKey : selectedKey;

  useEffect(() => {
    if (isFixed || !category || !marketplace || !geo) return;
    setLevelsLoaded(false);
    getLevels({ category, marketplace, geo, level })
      .then((rows) => {
        const relevant = rows.filter((r) => r.algorithm === 'EWMA' || r.algorithm === 'MACD');
        const sufficientKeys = [...new Set(
          relevant.filter((r) => r.sufficient).map((r) => r.level_key),
        )];
        setAvailableKeys(sufficientKeys);
        setSelectedKey((prev) => (prev && sufficientKeys.includes(prev) ? prev : sufficientKeys[0] || null));
        setLevelsLoaded(true);
      })
      .catch(() => { setAvailableKeys([]); setLevelsLoaded(true); });
  }, [isFixed, level, category, marketplace, geo]);

  useEffect(() => {
    if (!category || !marketplace || !geo || !levelKey) return;
    const params = { category, marketplace, geo, level, level_key: levelKey };

    setTrendStatus({ state: 'loading' });
    getSnapshot({ ...params, algorithm: 'EWMA' })
      .then((data) => {
        if (!data.meta.sufficient) { setTrendStatus({ state: 'hidden' }); return; }
        setTrendStatus({ state: 'ready', event: getCurrentEvent(data.events) });
      })
      .catch(() => setTrendStatus({ state: 'hidden' }));

    setEventStatus({ state: 'loading' });
    getSnapshot({ ...params, algorithm: 'MACD' })
      .then((data) => {
        if (!data.meta.sufficient) { setEventStatus({ state: 'hidden' }); return; }
        setEventStatus({ state: 'ready', event: getCurrentEvent(data.events) });
      })
      .catch(() => setEventStatus({ state: 'hidden' }));
  }, [category, marketplace, geo, level, levelKey]);

  if (!isFixed && !levelsLoaded) return null;
  if (!isFixed && availableKeys.length === 0) return null;
  if (levelKey && trendStatus.state === 'hidden' && eventStatus.state === 'hidden') return null;

  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>{headerLabel}</span>
        {isFixed ? (
          <span className={styles.headerValue}>«{fixedLevelKeyLabel}»</span>
        ) : (
          <select value={selectedKey || ''} onChange={(e) => setSelectedKey(e.target.value)}>
            {availableKeys.map((k) => (
              <option key={k} value={k}>{fmtLevelKey(k)}</option>
            ))}
          </select>
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.data}>
          <TrendCard status={trendStatus} />
          <EventCard status={eventStatus} />
        </div>
        <div className={styles.chart}>
          <p className={styles.muted}>График — на шаге 10</p>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsBlock;