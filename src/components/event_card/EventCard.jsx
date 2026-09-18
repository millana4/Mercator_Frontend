// ---------- Блок "Событие" — результат алгоритма MACD ----------
import { EVENT_LABEL, TREND_EVENT_TOOLTIP } from '../../constants/labels';
import { fmtArrow, fmtDate, fmtPct } from '../../utils/format';
import InfoTooltip from '../info_tooltip/InfoTooltip';
import styles from './EventCard.module.css';

function EventCard({ status }) {
  if (status.state === 'loading') {
    return (
      <div className={styles.section}>
        <p className={styles.muted}>Загрузка…</p>
      </div>
    );
  }

  if (status.state === 'hidden') return null;

  const event = status.event;
  const direction = event ? event.direction : 'none';
  const colorVar = direction === 'up' ? '--event-up' : direction === 'down' ? '--event-down' : '--event-none';
  const headerText = direction === 'none' ? 'не зарегистрировано' : EVENT_LABEL[direction];

  return (
    <div className={styles.section} style={{ color: `var(${colorVar})` }}>
      <div className={styles.title}>
        Событие: {headerText}
        {direction !== 'none' && <InfoTooltip text={TREND_EVENT_TOOLTIP} />}
      </div>
      {event && (
        <>
          <div className={styles.row}><span>Дата события</span><b>{fmtDate(event.start_at)}</b></div>
          <div className={styles.row}><span>Доля участвующих</span><b>{fmtPct(event.participation_pct)}</b></div>
          <div className={styles.row}>
            <span>Средняя величина изменения</span>
            <b>{fmtArrow(direction, event.magnitude_pct, '%')}</b>
          </div>
          <div className={styles.row}>
            <span>Средняя скорость изменения</span>
            <b>{fmtArrow(direction, event.speed_pct_per_day, '%/сутки')}</b>
          </div>
        </>
      )}
    </div>
  );
}

export default EventCard;