// ---------- Блок "Тренд" — результат алгоритма EWMA ----------
import { TREND_LABEL, TREND_EVENT_TOOLTIP } from '../../constants/labels';
import { fmtArrow, fmtDate, fmtPct } from '../../utils/format';
import InfoTooltip from '../info_tooltip/InfoTooltip';
import styles from './TrendCard.module.css';

function TrendCard({ status, isPanelOpen, onToggleParticipants }) {
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
  const colorVar = direction === 'up' ? '--trend-up' : direction === 'down' ? '--trend-down' : '--trend-none';

  return (
    <div className={styles.section} style={{ color: `var(${colorVar})` }}>
      <div className={styles.title}>
        Тренд: {TREND_LABEL[direction]}
         <InfoTooltip text={TREND_EVENT_TOOLTIP} />
      </div>
      {event && (
        <>
          <div className={styles.row}><span>Начало</span><b>{fmtDate(event.start_at)}</b></div>
          <div className={styles.row}><span>Доля участвующих</span><b>{fmtPct(event.participation_pct)}</b></div>
          <div className={styles.row}>
            <span>Средняя величина изменения</span>
            <b>{fmtArrow(direction, event.magnitude_pct, '%')}</b>
          </div>
          <div className={styles.row}>
            <span>Средняя скорость изменения</span>
            <b>{fmtArrow(direction, event.speed_pct_per_day, '%/сутки')}</b>
          </div>
          <button className={styles.btnToggle} onClick={onToggleParticipants}>
            {isPanelOpen ? 'Скрыть участников' : 'Посмотреть участников'}
          </button>
        </>
      )}
    </div>
  );
}

export default TrendCard;