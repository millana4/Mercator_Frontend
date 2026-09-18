// ---------- Одна строка списка участников: название + ссылка + кнопка динамики ----------
import styles from './ParticipantRow.module.css';

function ParticipantRow({ participant, isSelected, onShowDynamics }) {
  return (
    <div className={`${styles.row} ${isSelected ? styles.active : ''}`}>
      <a href={participant.url} target="_blank" rel="noopener noreferrer">
        {participant.name}
      </a>
      <button className={styles.btnToggle} onClick={() => onShowDynamics(participant.sku)}>
        Посмотреть динамику
      </button>
    </div>
  );
}

export default ParticipantRow;