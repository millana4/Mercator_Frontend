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

const EMPTY_SNAPSHOT = { meta: { sufficient: false }, events: [], curve: [] };

// Список срезов по умолчанию: уровни с готовым результатом EWMA или MACD из /levels.
// Загрузчик объявлен вне компонента - ссылка постоянная, эффект не перезапускается зря.
const loadLevelOptions = ({ category, marketplace, geo, level }) =>
  getLevels({ category, marketplace, geo, level }).then((rows) => {
    const relevant = rows.filter((r) => r.algorithm === 'EWMA' || r.algorithm === 'MACD');
    const keys = [...new Set(relevant.filter((r) => r.sufficient).map((r) => r.level_key))];
    return keys.map((k) => ({ value: k, label: fmtLevelKey(k) }));
  });

function AnalyticsBlock({
  level, headerLabel, fixedLevelKey, fixedLevelKeyLabel,
  loadOptions = loadLevelOptions,   // (params) => Promise<[{ value, label, ... }]>
  renderDetails,                    // (option) => содержимое панели подробностей
  detailsLabels,                    // { show, hide } - подписи кнопки подробностей
}) {
  const { category, marketplace, geo, period, customFrom, customTo } = useSelector((s) => s.dashboard);
  const isFixed = Boolean(fixedLevelKey);

  // Состояние хранится вместе с ключом запроса. При смене связки или среза ключ
  // не совпадает - значение считается сброшенным без setState внутри эффекта.
  const optionsKey = `${level}|${category}|${marketplace}|${geo}`;
  const [optionsState, setOptionsState] = useState({ key: null, options: [] });
  const [selectedKey, setSelectedKey] = useState(null);   // выбор пользователя в списке

  const levelsLoaded = optionsState.key === optionsKey;
  const availableOptions = levelsLoaded ? optionsState.options : [];
  const chosenKey = availableOptions.some((o) => o.value === selectedKey)
    ? selectedKey
    : (availableOptions[0]?.value ?? null);
  const levelKey = isFixed ? fixedLevelKey : chosenKey;
  const selectedOption = availableOptions.find((o) => o.value === levelKey) || null;

  const snapshotKey = levelKey ? `${optionsKey}|${levelKey}` : null;
  const [snapshots, setSnapshots] = useState({ key: null, EWMA: null, MACD: null });
  const [panelState, setPanelState] = useState({ key: null, panel: null });
  const [detailsState, setDetailsState] = useState({ key: null, open: false });

  const snapshotsFresh = snapshots.key === snapshotKey;
  const ewmaSnapshot = snapshotsFresh ? snapshots.EWMA : null;
  const macdSnapshot = snapshotsFresh ? snapshots.MACD : null;
  const panel = panelState.key === snapshotKey ? panelState.panel : null; // { kind, event } | null
  const detailsOpen = detailsState.key === snapshotKey && detailsState.open;

  useEffect(() => {
    if (isFixed || !category || !marketplace || !geo) return;
    let cancelled = false;
    loadOptions({ category, marketplace, geo, level })
      .then((options) => { if (!cancelled) setOptionsState({ key: optionsKey, options }); })
      .catch(() => { if (!cancelled) setOptionsState({ key: optionsKey, options: [] }); });
    return () => { cancelled = true; };
  }, [isFixed, level, category, marketplace, geo, optionsKey, loadOptions]);

  useEffect(() => {
    if (!category || !marketplace || !geo || !levelKey) return;
    let cancelled = false;
    const params = { category, marketplace, geo, level, level_key: levelKey };
    ['EWMA', 'MACD'].forEach((algorithm) => {
      getSnapshot({ ...params, algorithm })
        .catch(() => EMPTY_SNAPSHOT)
        .then((snapshot) => {
          if (cancelled) return;
          setSnapshots((cur) => ({
            ...(cur.key === snapshotKey ? cur : { key: snapshotKey, EWMA: null, MACD: null }),
            [algorithm]: snapshot,
          }));
        });
    });
    return () => { cancelled = true; };
  }, [category, marketplace, geo, level, levelKey, snapshotKey]);

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

  // Панель участников и подробности привязаны к текущему срезу
  const updatePanel = (fn) => setPanelState((cur) => ({
    key: snapshotKey, panel: fn(cur.key === snapshotKey ? cur.panel : null),
  }));
  const handleSelectChartEvent = (kind, event) => updatePanel(() => ({ kind, event }));
  const toggleTrendButton = () => updatePanel((cur) =>
    (cur && cur.kind === 'trend' ? null : { kind: 'trend', event: trendEvent }));
  const toggleEventButton = () => updatePanel((cur) =>
    (cur && cur.kind === 'event' ? null : { kind: 'event', event: eventEvent }));
  const closePanel = () => updatePanel(() => null);
  const toggleDetails = () => setDetailsState((cur) => ({
    key: snapshotKey, open: !(cur.key === snapshotKey && cur.open),
  }));

  if (!isFixed && !levelsLoaded) return null;
  if (!isFixed && availableOptions.length === 0) return null;
  if (levelKey && trendStatus.state === 'hidden' && eventStatus.state === 'hidden') return null;

  const hasDetails = Boolean(renderDetails && detailsLabels && selectedOption);

  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>{headerLabel}</span>
        {isFixed ? (
          <span className={styles.headerValue}>{fixedLevelKeyLabel}</span>
        ) : (
          <Dropdown
            value={levelKey}
            options={availableOptions.map((o) => ({ value: o.value, label: o.label }))}
            onChange={setSelectedKey}
          />
        )}
        {hasDetails && (
          <button className={styles.collapseBtn} onClick={toggleDetails}>
            {detailsOpen ? detailsLabels.hide : detailsLabels.show}
          </button>
        )}
      </div>

      {hasDetails && detailsOpen && (
        <div className={styles.details}>{renderDetails(selectedOption)}</div>
      )}

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
          onClose={closePanel}
        />
      )}
    </div>
  );
}

export default AnalyticsBlock;