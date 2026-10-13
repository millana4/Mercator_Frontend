// ---------- Форма добавления ниши: связка из подписок, ссылка на референс (обязательна),
// описание (по желанию) ----------
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Dropdown from '../dropdown/Dropdown';
import { CATEGORY_LABELS, MARKETPLACE_LABELS } from '../../constants/labels';
import { addNiche, clearCreateResult } from '../../store/slices/nichesSlice';
import { referenceUrlError } from '../../utils/nicheValidation';
import styles from './NicheForm.module.css';

const uniq = (values) => [...new Set(values)];
const categoriesOf = (sets) => uniq(sets.map((s) => s.category));
const marketplacesOf = (sets, category) =>
  uniq(sets.filter((s) => s.category === category).map((s) => s.marketplace));
const geosOf = (sets, category, marketplace) =>
  uniq(sets.filter((s) => s.category === category && s.marketplace === marketplace)
    .map((s) => s.geo));

// Уровень с единственным вариантом подставляется сам - как в строках блока «Категории»
function autofill(form, sets) {
  const next = { ...form };
  if (!next.category) {
    const categories = categoriesOf(sets);
    if (categories.length === 1) next.category = categories[0];
  }
  if (next.category && !next.marketplace) {
    const marketplaces = marketplacesOf(sets, next.category);
    if (marketplaces.length === 1) next.marketplace = marketplaces[0];
  }
  if (next.marketplace && !next.geo) {
    const geos = geosOf(sets, next.category, next.marketplace);
    if (geos.length === 1) next.geo = geos[0];
  }
  return next;
}

const EMPTY = { category: '', marketplace: '', geo: '', description: '', referenceUrl: '' };

function NicheForm({ onDone, onCancel }) {
  const dispatch = useDispatch();
  const savedSets = useSelector((s) => s.settings.savedSets);
  const { creating, createError } = useSelector((s) => s.niches);
  const [form, setForm] = useState(() => autofill(EMPTY, savedSets));
  const [localError, setLocalError] = useState(null);

  if (savedSets.length === 0) {
    return (
      <div className={styles.form}>
        <p className={styles.muted}>
          Сначала сохраните хотя бы одну категорию в блоке «Категории»: нишу можно добавить
          только в доступной вам связке.
        </p>
        <button className={styles.btnSecondary} onClick={onCancel}>Закрыть</button>
      </div>
    );
  }

  const resetErrors = () => {
    setLocalError(null);
    if (createError) dispatch(clearCreateResult());
  };

  const setLevel = (field, value) => {
    const next = { ...form, [field]: value };
    if (field === 'category') { next.marketplace = ''; next.geo = ''; }
    if (field === 'marketplace') { next.geo = ''; }
    setForm(autofill(next, savedSets));
    resetErrors();
  };

  const setText = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    resetErrors();
  };

  const handleSubmit = async () => {
    const description = form.description.trim();
    const referenceUrl = form.referenceUrl.trim();
    if (!form.category || !form.marketplace || !form.geo) {
      setLocalError('Выберите категорию, маркетплейс и гео.');
      return;
    }
    if (!referenceUrl) {
      setLocalError('Укажите ссылку на карточку-референс: похожие товары подбираются по ней.');
      return;
    }
    const urlError = referenceUrlError(form.marketplace, referenceUrl);
    if (urlError) {
      setLocalError(urlError);
      return;
    }
    try {
      await dispatch(addNiche({
        category: form.category, marketplace: form.marketplace, geo: form.geo,
        description: description || null, reference_url: referenceUrl,
      })).unwrap();
      onDone();
    } catch {
      // причину отказа сервера слайс положил в createError - она показана под полями
    }
  };

  const error = localError || createError;

  return (
    <div className={styles.form}>
      <div className={styles.row}>
        <Dropdown
          value={form.category}
          placeholder="— категория —"
          options={categoriesOf(savedSets).map((c) => ({ value: c, label: CATEGORY_LABELS[c] || c }))}
          onChange={(value) => setLevel('category', value)}
        />
        <Dropdown
          value={form.marketplace}
          placeholder="— маркетплейс —"
          disabled={!form.category}
          options={marketplacesOf(savedSets, form.category)
            .map((m) => ({ value: m, label: MARKETPLACE_LABELS[m] || m }))}
          onChange={(value) => setLevel('marketplace', value)}
        />
        <Dropdown
          value={form.geo}
          placeholder="— гео —"
          disabled={!form.marketplace}
          options={geosOf(savedSets, form.category, form.marketplace)
            .map((g) => ({ value: g, label: g }))}
          onChange={(value) => setLevel('geo', value)}
        />
      </div>

      <p className={styles.hint}>
        Ссылка на карточку-референс обязательна: похожие товары подбираются по ней.
        Описание — по желанию.
      </p>

      <label className={styles.field}>
        <span className={styles.label}>Ссылка на референс</span>
        <input
          className={styles.input}
          type="url"
          required
          value={form.referenceUrl}
          onChange={setText('referenceUrl')}
          placeholder="https://www.ozon.ru/product/...-123456789/"
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Описание (по желанию)</span>
        <textarea
          className={styles.input}
          rows={3}
          value={form.description}
          onChange={setText('description')}
          placeholder="Например: лёгкое хлопковое платье для девочки 7–9 лет"
        />
      </label>

      {error && <p className={styles.errorNote}>{error}</p>}

      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={handleSubmit} disabled={creating}>
          {creating ? 'Добавление…' : 'Добавить'}
        </button>
        <button className={styles.btnSecondary} onClick={onCancel} disabled={creating}>
          Отмена
        </button>
      </div>
    </div>
  );
}

export default NicheForm;