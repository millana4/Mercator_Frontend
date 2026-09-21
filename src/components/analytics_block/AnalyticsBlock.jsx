// ---------- Один блок аналитики: шапка + Тренд/Событие + график + участники ----------
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { getLevels, getSnapshot } from '../../services/api';
import { getCurrentEvent, getParticipantsTitle, getPeriodRange } from '../../utils/analytics';
import { fmtLevelKey } from '../../utils/format';
import TrendCard from '../trend_card/TrendCard';
import EventCard from '../event_card/EventCard';
import MarketChart from '../market_chart/MarketChart';
import ParticipantsPanel from '../participants_panel/ParticipantsPanel';
import Dropdown from '../dropdown/Dropdown';
import styles from './AnalyticsBlock.module.css';

function AnalyticsBlock({ level, headerLabel, fixedLevelKey, fixedLevelKeyLabel }) {
  const { category, marketplace, geo, period, customFrom, customTo } = useSelector((s) => s.dashboard);
  const isFixed = Boolean(fixedLevelKey);

  const [availableKeys, setAvailableKeys] = useState([]);
  const [levelsLoaded, setLevelsLoaded] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [ewmaSnapshot, setEwmaSnapshot] = useState(null);
  const [macdSnapshot, setMacdSnapshot] = useState(null);
  const [panel, setPanel] = useState(null); // { kind: 'trend'|'event', event } | null

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

    setPanel(null);

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

  const chartReady = ewmaSnapshot && ewmaSnapshot.meta.sufficient;

  const periodRange = useMemo(() => {
    if (!chartReady) return null;
    return getPeriodRange(period, customFrom, customTo, ewmaSnapshot.curve);
  }, [chartReady, period, customFrom, customTo, ewmaSnapshot]);

  const handleSelectChartEvent = (kind, event) => setPanel({ kind, event });

  const toggleTrendButton = () => setPanel((cur) =>
    (cur && cur.kind === 'trend' ? null : { kind: 'trend', event: trendEvent }));
  const toggleEventButton = () => setPanel((cur) =>
    (cur && cur.kind === 'event' ? null : { kind: 'event', event: eventEvent }));

  if (!isFixed && !levelsLoaded) return null;
  if (!isFixed && availableKeys.length === 0) return null;
  if (levelKey && trendStatus.state === 'hidden' && eventStatus.state === 'hidden') return null;

  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>{headerLabel}</span>
        {isFixed ? (
          <span className={styles.headerValue}>{fixedLevelKeyLabel}</span>
        ) : (
          <Dropdown
            value={selectedKey}
            options={availableKeys.map((k) => ({ value: k, label: fmtLevelKey(k) }))}
            onChange={setSelectedKey}
          />
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.data}>
          <TrendCard
            status={trendStatus}
            isPanelOpen={panel !== null && panel.kind === 'trend'}
            onToggleParticipants={toggleTrendButton}
          />
          <EventCard
            status={eventStatus}
            isPanelOpen={panel !== null && panel.kind === 'event'}
            onToggleParticipants={toggleEventButton}
          />
        </div>
        <div className={styles.chart}>
          {chartReady && periodRange ? (
            <MarketChart
              curve={ewmaSnapshot.curve}
              trendEvents={ewmaSnapshot.events}
              eventEvents={macdSnapshot && macdSnapshot.meta.sufficient ? macdSnapshot.events : []}
              periodFrom={periodRange.from}
              periodTo={periodRange.to}
              onSelectEvent={handleSelectChartEvent}
            />
          ) : (
            <p className={styles.muted}>Недостаточно точек для графика.</p>
          )}
        </div>
      </div>

      {panel && periodRange && (
        <ParticipantsPanel
          title={getParticipantsTitle(panel.kind, panel.event)}
          colorVar={
            panel.kind === 'trend'
              ? (panel.event.direction === 'up' ? '--trend-up' : '--trend-down')
              : (panel.event.direction === 'up' ? '--event-up' : '--event-down')
          }
          eventId={panel.event.id}
          periodFrom={periodRange.from}
          periodTo={periodRange.to}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  );
}

export default AnalyticsBlock;