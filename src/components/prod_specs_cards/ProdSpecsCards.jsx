// ---------- Список проанализированных карточек: ссылка + «Динамика цен» + график цены ----------
import { useState } from 'react';
import { PROD_SPECS_LABELS as L } from '../../constants/labels';
import ParticipantRow from '../participant_row/ParticipantRow';
import CardDynamicsChart from '../card_dynamics_chart/CardDynamicsChart';
import { collapseSmoothly } from '../../utils/collapse';
import styles from './ProdSpecsCards.module.css';

// Выбранная карточка - состояние компонента; при смене страты родитель меняет key
// и компонент создаётся заново: график закрывается.
function ProdSpecsCards({ cards, periodFrom, periodTo }) {
  const [selectedSku, setSelectedSku] = useState(null);
  const selected = cards.find((c) => c.sku === selectedSku) || null;

  return (
    <div>
      <div className={styles.list}>
        {cards.map((c) => (
          <ParticipantRow
            key={c.sku}
            participant={c}
            isSelected={c.sku === selectedSku}
            onShowDynamics={setSelectedSku}
          />
        ))}
      </div>

      {selected && periodFrom && periodTo && (
        <>
          <CardDynamicsChart sku={selected.sku} name={selected.name} url={selected.url}
            periodFrom={periodFrom} periodTo={periodTo} />
          <div className={styles.actions}>
            <button className={styles.btnSecondary}
              onClick={(e) => collapseSmoothly(e.currentTarget, () => setSelectedSku(null))}>
              {L.hideChart}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ProdSpecsCards;