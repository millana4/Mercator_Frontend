// ---------- Блок настроек «Товарные ниши»: список ниш, лимит, добавление своей ----------
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import NicheForm from '../niche_form/NicheForm';
import {
  CATEGORY_LABELS, MARKETPLACE_LABELS, NICHE_CREATED_TEXT, NICHE_PENDING_NOTE,
  NICHE_STATUS_LABELS, nicheLimitText,
} from '../../constants/labels';
import {
  clearCreateResult, fetchNicheLimits, fetchNiches, removeNiche,
} from '../../store/slices/nichesSlice';
import styles from './NichesBlock.module.css';
import { capitalize } from '../../utils/text';

// Подпись: запрос нейросети с заглавной буквы; пока его нет - описание пользователя или ссылка
const nicheTitle = (n) => capitalize(n.search_query || n.description) || n.reference_url;

// pending - ещё не отправлена в ядро; дальше - статус обработки в ядре
const nicheStatusKey = (n) => (n.status === 'pending' ? 'pending' : (n.core_status || 'submitted'));

const deleteQuestion = (n) =>
  `Удалить нишу «${nicheTitle(n)}»?\n\n`
  + 'Ниша удаляется навсегда, восстановить её нельзя. Если она снова понадобится, '
  + 'её придётся добавить заново, а подбор карточек и накопление замеров займут время.';

function NichesBlock() {
  const dispatch = useDispatch();
  const { items, limits, createdStatus, deleteError } = useSelector((s) => s.niches);
  const savedSets = useSelector((s) => s.settings.savedSets);
  const [formOpen, setFormOpen] = useState(false);

  // видимость ниш зависит от подписок - после их сохранения список перезагружается
  useEffect(() => {
    dispatch(fetchNiches());
    dispatch(fetchNicheLimits());
  }, [dispatch, savedSets]);

  const limitReached = Boolean(limits) && limits.used >= limits.limit;
  // пометка «моя» нужна, только если в списке есть и чужие ниши (режим видимости all)
  const showOwnBadge = items.some((n) => !n.is_own);

  const openForm = () => {
    dispatch(clearCreateResult());
    setFormOpen(true);
  };

  const handleDelete = (niche) => {
    if (window.confirm(deleteQuestion(niche))) dispatch(removeNiche(niche.id));
  };

  return (
    <div className={styles.block}>
      <h2 className={styles.sectionTitle}>Товарные ниши</h2>

      {items.length === 0 && <p className={styles.muted}>Ниш пока нет.</p>}
      <div className={styles.list}>
        {items.map((n) => {
          const statusKey = nicheStatusKey(n);
          return (
            <div key={n.id} className={styles.item}>
              <div className={styles.itemMain}>
                <div className={styles.itemTitle}>
                  {nicheTitle(n)}
                  {showOwnBadge && n.is_own && <span className={styles.ownBadge}>моя</span>}
                </div>
                <div className={styles.itemMeta}>
                  {CATEGORY_LABELS[n.category] || n.category}
                  {' · '}{MARKETPLACE_LABELS[n.marketplace] || n.marketplace}
                  {' · '}{n.geo}
                  {' · '}
                  <span className={statusKey === 'failed' ? styles.statusFailed : undefined}>
                    {NICHE_STATUS_LABELS[statusKey] || statusKey}
                  </span>
                </div>
                {statusKey === 'failed' && n.core_error && (
                  <div className={styles.errorNote}>{n.core_error}</div>
                )}
              </div>
              {n.is_own && (
                <button className={styles.remove} title="Удалить нишу" onClick={() => handleDelete(n)}>
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
      {deleteError && <p className={styles.errorNote}>{deleteError}</p>}

      {createdStatus && (
        <p className={styles.notice}>
          <span className={styles.check}>✓</span>
          {NICHE_CREATED_TEXT}
          {createdStatus === 'pending' && ` ${NICHE_PENDING_NOTE}`}
        </p>
      )}

      {limits && <p className={styles.limitNote}>{nicheLimitText(limits)}</p>}
      {formOpen ? (
        <NicheForm onDone={() => setFormOpen(false)} onCancel={() => setFormOpen(false)} />
      ) : (
        <button className={styles.btnSecondary} onClick={openForm} disabled={limitReached}>
          Добавить
        </button>
      )}
    </div>
  );
}

export default NichesBlock;