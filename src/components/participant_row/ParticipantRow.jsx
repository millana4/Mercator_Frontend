// ---------- Одна строка списка участников: название + ссылка + кнопка динамики ----------
import { CARD_CHART_LABELS } from '../../constants/labels';
import styles from './ParticipantRow.module.css';

function ParticipantRow({ participant, isSelected, onShowDynamics }) {
  return (
    <div className={`${styles.row} ${isSelected ? styles.active : ''}`}>
      <a href={participant.url} target="_blank" rel="noopener noreferrer">
        {participant.name}
      </a>
      <button className={styles.btnToggle} onClick={() => onShowDynamics(participant.sku)}>
        {CARD_CHART_LABELS.dynamics}
      </button>
    </div>
  );
}

export default ParticipantRow;