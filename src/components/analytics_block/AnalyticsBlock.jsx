// ---------- Один блок аналитики: шапка + Тренд/Событие + график + участники ----------
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { getLevels, getSnapshot } from '../../services/api';
import { getCurrentEvent, getParticipantsTitle } from '../../utils/analytics';
import { fmtLevelKey } from '../../utils/format';
import TrendCard from '../trend_card/TrendCard';
import EventCard from '../event_card/EventCard';
import MarketChart from '../market_chart/MarketChart';
import ParticipantsPanel from '../participants_panel/ParticipantsPanel';
import styles from './AnalyticsBlock.module.css';

function AnalyticsBlock({ level, headerLabel, fixedLevelKey, fixedLevelKeyLabel }) {
  const { category, marketplace, geo } = useSelector((s) => s.dashboard);
  const isFixed = Boolean(fixedLevelKey);

  const [availableKeys, setAvailableKeys] = useState([]);
  const [levelsLoaded, setLevelsLoaded] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [ewmaSnapshot, setEwmaSnapshot] = useState(null);
  const [macdSnapshot, setMacdSnapshot] = useState(null);
  const [trendPanelOpen, setTrendPanelOpen] = useState(false);
  const [eventPanelOpen, setEventPanelOpen] = useState(false);

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

    setTrendPanelOpen(false);
    setEventPanelOpen(false);

    setEwmaSnapshot(null);
    getSnapshot({ ...params, algorithm: 'EWMA' })
      .then(setEwmaSnapshot)
      .catch(() => setEwmaSnapshot({ meta: { sufficient: false }, events: [], curve: [] }));

    setMacdSnapshot(null);
    getSnapshot({ ...params, algorithm: 'MACD' })
      .then(setMacdSnapshot)
      .catch(() => setMacdSnapshot({ meta: { sufficient: false }, events: [], curve: [] }));
  }, [category, marketplace, geo, level, levelKey]);

  const trendEvent = ewmaSnapshot && ewmaSnapshot.meta.sufficient ? getCurrentEvent(ewmaSnapshot.events) : null;
  const eventEvent = macdSnapshot && macdSnapshot.meta.sufficient ? getCurrentEvent(macdSnapshot.events) : null;

  const trendStatus = !ewmaSnapshot
    ? { state: 'loading' }
    : !ewmaSnapshot.meta.sufficient
      ? { state: 'hidden' }
      : { state: 'ready', event: trendEvent };

  const eventStatus = !macdSnapshot
    ? { state: 'loading' }
    : !macdSnapshot.meta.sufficient
      ? { state: 'hidden' }
      : { state: 'ready', event: eventEvent };

  if (!isFixed && !levelsLoaded) return null;
  if (!isFixed && availableKeys.length === 0) return null;
  if (levelKey && trendStatus.state === 'hidden' && eventStatus.state === 'hidden') return null;

  const chartReady = ewmaSnapshot && ewmaSnapshot.meta.sufficient;

  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>{headerLabel}</span>
        {isFixed ? (
          <span className={styles.headerValue}>{fixedLevelKeyLabel}</span>
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
          <TrendCard
            status={trendStatus}
            isPanelOpen={trendPanelOpen}
            onToggleParticipants={() => setTrendPanelOpen((v) => !v)}
          />
          <EventCard
            status={eventStatus}
            isPanelOpen={eventPanelOpen}
            onToggleParticipants={() => setEventPanelOpen((v) => !v)}
          />
        </div>
        <div className={styles.chart}>
          {chartReady ? (
            <MarketChart
              curve={ewmaSnapshot.curve}
              trendEvents={ewmaSnapshot.events}
              eventEvents={macdSnapshot && macdSnapshot.meta.sufficient ? macdSnapshot.events : []}
            />
          ) : (
            <p className={styles.muted}>Недостаточно точек для графика.</p>
          )}
        </div>
      </div>

      {trendPanelOpen && trendEvent && (
        <ParticipantsPanel
          title={getParticipantsTitle('trend', trendEvent.direction)}
          colorVar={trendEvent.direction === 'up' ? '--trend-up' : '--trend-down'}
          eventId={trendEvent.id}
          onClose={() => setTrendPanelOpen(false)}
        />
      )}
      {eventPanelOpen && eventEvent && (
        <ParticipantsPanel
          title={getParticipantsTitle('event', eventEvent.direction)}
          colorVar={eventEvent.direction === 'up' ? '--event-up' : '--event-down'}
          eventId={eventEvent.id}
          onClose={() => setEventPanelOpen(false)}
        />
      )}
    </div>
  );
}

export default AnalyticsBlock;