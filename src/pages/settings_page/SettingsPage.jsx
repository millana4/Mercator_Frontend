// ---------- Страница настроек: данные пользователя, подписки на категории, товарные ниши ----------
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Header from '../../components/header/Header';
import ProtectedRoute from '../../components/protected_route/ProtectedRoute';
import SettingsRow from '../../components/settings_row/SettingsRow';
import NichesBlock from '../../components/niches_block/NichesBlock';
import {
  fetchCatalog, fetchSubscriptions, saveSubscriptions,
  addRow, removeRow, updateRow, setSaveError,
} from '../../store/slices/settingsSlice';
import styles from './SettingsPage.module.css';

function SettingsPage() {
  const dispatch = useDispatch();
  const { catalog, savedSets, draftRows, dirty, dupMessage, saveError } = useSelector(
    (s) => s.settings,
  );
  const username = useSelector((s) => s.auth.username);

  useEffect(() => {
    dispatch(fetchCatalog());
    dispatch(fetchSubscriptions());
  }, [dispatch]);

  const handleSave = () => {
    const incomplete = draftRows.some((r) => !r.category || !r.marketplace || !r.geo);
    if (incomplete) {
      dispatch(setSaveError('Заполните категорию, маркетплейс и гео в каждой строке.'));
      return;
    }
    dispatch(saveSubscriptions(draftRows));
  };

  const buttonLabel = dirty || savedSets.length === 0 ? 'Сохранить настройки' : 'Изменить настройки';

  return (
    <div>
      <Header />
      <ProtectedRoute>
        <div className={styles.pageWrap}>
          <div className={styles.block}>
            <h2 className={styles.sectionTitle}>Данные пользователя</h2>
            <p className={styles.muted}>Логин: {username}</p>
          </div>

          <div className={styles.block}>
            <h2 className={styles.sectionTitle}>Категории</h2>
            <div className={styles.rowsList}>
              {draftRows.length === 0 && (
                <p className={styles.muted}>Строк пока нет — нажмите «Добавить».</p>
              )}
              {draftRows.map((row, index) => (
                <SettingsRow
                  key={index}
                  row={row}
                  index={index}
                  catalog={catalog}
                  onChange={(i, field, value) => dispatch(updateRow({ index: i, field, value }))}
                  onRemove={(i) => dispatch(removeRow(i))}
                />
              ))}
            </div>
            <div className={styles.rowsActions}>
              <button className={styles.btnSecondary} onClick={() => dispatch(addRow())}>
                Добавить
              </button>
            </div>
            {saveError && <p className={styles.errorNote}>{saveError}</p>}
            {dupMessage && <p className={styles.muted}>{dupMessage}</p>}
            <button className={styles.btnPrimary} onClick={handleSave}>
              {buttonLabel}
            </button>
          </div>

          <NichesBlock />
        </div>
      </ProtectedRoute>
    </div>
  );
}

export default SettingsPage;