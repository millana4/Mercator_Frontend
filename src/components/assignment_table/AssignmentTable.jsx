// ---------- Таблица задания сета как в CSV: строка подкатегории, под ней строки предметов ----------
// editable - черновик: поля редактируются, строки добавляются и удаляются; иначе только просмотр.
import { useState } from 'react';
import EditableCell from '../editable_cell/EditableCell';
import {
  ADMIN_LABELS, ADMIN_TABLE_COLUMNS, adminErrorText, confirmDeleteStratum,
  confirmDeleteSubcategory, genderOptions, validateBaseShare, validateShare, validateText,
} from '../../constants/labels';
import { fmtFigure, fmtShare, isNumberDraft } from '../../utils/format';
import styles from './AssignmentTable.module.css';

const LAYERS = [0, 1, 2, 3];
const DEFAULT_BASE_SHARE = 0.5;   // как у всех сезонных страт в задании

const genderLabel = (genders, code) => genders.find((g) => g.value === code)?.label || code;

// Добавленные в черновике строки - в конце списка в порядке добавления (без прыжков
// в середину); при следующем открытии сет показывается в обычной сортировке.
const lastAt = (items, appended) => {
  if (appended.length === 0) return items;
  const rank = new Map(appended.map((id, i) => [id, i]));
  return [
    ...items.filter((x) => !rank.has(x.id)),
    ...items.filter((x) => rank.has(x.id)).sort((a, b) => rank.get(a.id) - rank.get(b.id)),
  ];
};
// id строк, которых не было до правки
const newIds = (before, after) => {
  const old = new Set(before.map((x) => x.id));
  return after.filter((x) => !old.has(x.id)).map((x) => x.id);
};

// поле доли в формах добавления: лишние символы не вводятся
const shareInput = (setter) => (e) => {
  if (isNumberDraft('decimal', e.target.value.trim())) setter(e.target.value);
};

// ---------- Ячейки ----------
function Check({ checked, onSave }) {
  const [error, setError] = useState(null);
  const handle = async (e) => {
    try {
      await onSave(e.target.checked);
      setError(null);
    } catch (status) {
      setError(adminErrorText(status));
    }
  };
  return (
    <>
      <input type="checkbox" checked={checked} onChange={handle} />
      {error && <div className={styles.error}>{error}</div>}
    </>
  );
}

function Select({ value, options, onSave }) {
  const [error, setError] = useState(null);
  const handle = async (e) => {
    const raw = e.target.value;
    const option = options.find((o) => String(o.value) === raw);
    try {
      await onSave(option ? option.value : raw);
      setError(null);
    } catch (status) {
      setError(adminErrorText(status));
    }
  };
  return (
    <>
      <select className={styles.select} value={value ?? ''} onChange={handle}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <div className={styles.error}>{error}</div>}
    </>
  );
}

// ---------- Формы добавления ----------
function AddStratumRow({ onAdd, onCancel }) {
  const [item, setItem] = useState('');
  const [query, setQuery] = useState('');
  const [share, setShare] = useState('');
  const [seasonal, setSeasonal] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    const queryShare = share.trim() === '' ? null : Number(share.replace(',', '.'));
    const problem = validateText(item.trim()) || validateText(query.trim())
      || (queryShare === null ? null : validateShare(queryShare));
    if (problem) {
      setError(problem);
      return;
    }
    try {
      await onAdd({
        item: item.trim(), query: query.trim(), query_share: queryShare,
        is_seasonal: seasonal, base_share: seasonal ? DEFAULT_BASE_SHARE : null,
      });
    } catch (status) {
      setError(adminErrorText(status));
    }
  };

  return (
    <tr className={styles.addRow}>
      <td colSpan={9} className={styles.addHint}>{ADMIN_LABELS.newStratum}</td>
      <td><input className={styles.input} value={item} placeholder={ADMIN_LABELS.item}
                 onChange={(e) => setItem(e.target.value)} /></td>
      <td><input className={`${styles.input} ${styles.wide}`} value={query}
                 placeholder={ADMIN_LABELS.query} onChange={(e) => setQuery(e.target.value)} /></td>
      <td><input className={`${styles.input} ${styles.decimal}`} value={share} placeholder="1" inputMode="decimal"
                 onChange={shareInput(setShare)} /></td>
      <td><input type="checkbox" checked={seasonal} onChange={(e) => setSeasonal(e.target.checked)} /></td>
      <td colSpan={3}>
        <button className={styles.btnSmall} onClick={submit}>{ADMIN_LABELS.add}</button>
        <button className={styles.btnLink} onClick={onCancel}>{ADMIN_LABELS.cancel}</button>
        {error && <div className={styles.error}>{error}</div>}
      </td>
      <td />
    </tr>
  );
}

function AddSubcategoryRow({ genders, onAdd, onCancel }) {
  const [title, setTitle] = useState('');
  const [segment, setSegment] = useState(genders[0].value);
  const [layer, setLayer] = useState(1);
  const [share, setShare] = useState('');
  const [tracked, setTracked] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    const value = Number(share.replace(',', '.'));
    const problem = validateText(title.trim()) || validateShare(share.trim() === '' ? NaN : value);
    if (problem) {
      setError(problem);
      return;
    }
    try {
      await onAdd({ title: title.trim(), segment, layer, share: value, tracked });
    } catch (status) {
      setError(adminErrorText(status));
    }
  };

  return (
    <tr className={styles.addRow}>
      <td>
        <select className={styles.select} value={segment} onChange={(e) => setSegment(e.target.value)}>
          {genders.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
      </td>
      <td>
        <select className={styles.select} value={layer} onChange={(e) => setLayer(Number(e.target.value))}>
          {LAYERS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </td>
      <td><input className={`${styles.input} ${styles.wide}`} value={title}
                 placeholder={ADMIN_LABELS.subcategory} onChange={(e) => setTitle(e.target.value)} /></td>
      <td><input className={`${styles.input} ${styles.decimal}`} value={share} placeholder="0,01" inputMode="decimal"
                 onChange={shareInput(setShare)} /></td>
      <td />
      <td><input type="checkbox" checked={tracked} onChange={(e) => setTracked(e.target.checked)} /></td>
      <td colSpan={10}>
        <button className={styles.btnSmall} onClick={submit}>{ADMIN_LABELS.add}</button>
        <button className={styles.btnLink} onClick={onCancel}>{ADMIN_LABELS.cancel}</button>
        {error && <div className={styles.error}>{error}</div>}
      </td>
      <td />
    </tr>
  );
}

// ---------- Таблица ----------
// onEdit(action, ...args) -> Promise: правка черновика (adminSlice.editDraft)
function AssignmentTable({ view, editable = false, onEdit }) {
  const [addingFor, setAddingFor] = useState(null);      // id подкатегории с формой предмета
  const [addingSub, setAddingSub] = useState(false);
  const [appendedSubs, setAppendedSubs] = useState([]);       // добавленные подкатегории
  const [appendedStrata, setAppendedStrata] = useState([]);   // добавленные предметы
  const draftId = view.set.id;
  const genders = genderOptions(view.category);

  const editSub = (sub, change) => onEdit('subcategory', draftId, sub.id, change);
  const editStratum = (st, change) => onEdit('stratum', draftId, st.id, change);

  const deleteSub = (sub) => {
    if (window.confirm(confirmDeleteSubcategory(sub.title))) {
      onEdit('deleteSubcategory', draftId, sub.id)
        .catch((status) => window.alert(adminErrorText(status)));
    }
  };
  const deleteStratum = (st) => {
    if (window.confirm(confirmDeleteStratum(st.item))) {
      onEdit('deleteStratum', draftId, st.id)
        .catch((status) => window.alert(adminErrorText(status)));
    }
  };

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            {ADMIN_TABLE_COLUMNS.map((c) => <th key={c}>{c}</th>)}
            {editable && <th />}
          </tr>
        </thead>
        <tbody>
          {lastAt(view.subcategories, appendedSubs).map((sub) => (
            <SubcategoryRows
              key={sub.id}
              sub={sub}
              appendedStrata={appendedStrata}
              genders={genders}
              editable={editable}
              onEditSub={(change) => editSub(sub, change)}
              onEditStratum={editStratum}
              onDeleteSub={() => deleteSub(sub)}
              onDeleteStratum={deleteStratum}
              adding={addingFor === sub.id}
              onStartAdd={() => setAddingFor(sub.id)}
              onCancelAdd={() => setAddingFor(null)}
              onAddStratum={(body) => onEdit('addStratum', draftId, sub.id, body)
                .then((next) => {
                  const nextSub = next.subcategories.find((s) => s.id === sub.id);
                  setAppendedStrata((prev) => [...prev, ...newIds(sub.strata, nextSub ? nextSub.strata : [])]);
                  setAddingFor(null);
                })}
            />
          ))}
          {editable && addingSub && (
            <AddSubcategoryRow
              genders={genders}
              onAdd={(body) => onEdit('addSubcategory', draftId, body).then((next) => {
                setAppendedSubs((prev) => [...prev, ...newIds(view.subcategories, next.subcategories)]);
                setAddingSub(false);
              })}
              onCancel={() => setAddingSub(false)}
            />
          )}
        </tbody>
      </table>
      {editable && !addingSub && (
        <button className={styles.btnLink} onClick={() => setAddingSub(true)}>
          {ADMIN_LABELS.addSubcategory}
        </button>
      )}
    </div>
  );
}

function SubcategoryRows({
  sub, appendedStrata, genders, editable, onEditSub, onEditStratum, onDeleteSub, onDeleteStratum,
  adding, onStartAdd, onCancelAdd, onAddStratum,
}) {
  const k = (field, value) => `${sub.id}-${field}-${value}`;   // новое значение - новое поле
  return (
    <>
      <tr className={styles.subRow}>
        <td>
          {editable
            ? <Select value={sub.segment} options={genders}
                      onSave={(segment) => onEditSub({ segment })} />
            : genderLabel(genders, sub.segment)}
        </td>
        <td>
          {editable
            ? <Select value={sub.layer} options={LAYERS.map((l) => ({ value: l, label: String(l) }))}
                      onSave={(layer) => onEditSub({ layer })} />
            : sub.layer}
        </td>
        <td className={styles.title}>
          {editable
            ? <EditableCell key={k('title', sub.title)} value={sub.title} wide validate={validateText}
                            onSave={(title) => onEditSub({ title })} />
            : sub.title}
        </td>
        <td>
          {editable
            ? <EditableCell key={k('share', sub.share)} value={sub.share} kind="decimal"
                            validate={validateShare} onSave={(share) => onEditSub({ share })} />
            : fmtShare(sub.share)}
        </td>
        <td>{fmtFigure(sub.base)}</td>
        <td>
          {editable
            ? <Check checked={sub.tracked} onSave={(tracked) => onEditSub({ tracked })} />
            : (sub.tracked ? ADMIN_LABELS.yes : '')}
        </td>
        <td>{fmtFigure(sub.with_addition)}</td>
        <td>{fmtFigure(sub.with_rotation)}</td>
        <td className={styles.total}>{sub.total ?? ''}</td>
        <td colSpan={7} />
        {editable && (
          <td className={styles.actions}>
            <button className={styles.remove} title={ADMIN_LABELS.deleteSubcategory}
                    onClick={onDeleteSub}>×</button>
          </td>
        )}
      </tr>
      {lastAt(sub.strata, appendedStrata).map((st) => {
        const sk = (field, value) => `${st.id}-${field}-${value}`;
        return (
          <tr key={st.id} className={st.count === 0 ? styles.zeroRow : undefined}>
            <td colSpan={9} />
            <td>
              {editable
                ? <EditableCell key={sk('item', st.item)} value={st.item} validate={validateText}
                                onSave={(item) => onEditStratum(st, { item })} />
                : st.item}
            </td>
            <td>
              {editable
                ? <EditableCell key={sk('query', st.query)} value={st.query} wide validate={validateText}
                                onSave={(query) => onEditStratum(st, { query })} />
                : st.query}
            </td>
            <td>
              {editable
                ? <EditableCell key={sk('qs', st.query_share)} value={st.query_share} kind="decimal"
                                validate={validateShare}
                                onSave={(share) => onEditStratum(st, { query_share: share })} />
                : fmtShare(st.query_share)}
            </td>
            <td>
              {editable
                ? <Check checked={st.is_seasonal}
                         onSave={(on) => onEditStratum(st, on && st.base_share === null
                           ? { is_seasonal: true, base_share: DEFAULT_BASE_SHARE }
                           : { is_seasonal: on })} />
                : (st.is_seasonal ? ADMIN_LABELS.yes : '')}
            </td>
            <td>
              {editable && st.is_seasonal
                ? <EditableCell key={sk('base', st.base_share)} value={st.base_share} kind="decimal"
                                validate={validateBaseShare}
                                onSave={(share) => onEditStratum(st, { base_share: share })} />
                : fmtShare(st.base_share)}
            </td>
            <td className={styles.total}>{st.count}</td>
            <td>{st.analysis_quota ?? ''}</td>
            {editable && (
              <td className={styles.actions}>
                <button className={styles.remove} title={ADMIN_LABELS.deleteStratum}
                        onClick={() => onDeleteStratum(st)}>×</button>
              </td>
            )}
          </tr>
        );
      })}
      {editable && (adding
        ? <AddStratumRow onAdd={onAddStratum} onCancel={onCancelAdd} />
        : (
          <tr>
            <td colSpan={9} />
            <td colSpan={8}>
              <button className={styles.btnLink} onClick={onStartAdd}>{ADMIN_LABELS.addStratum}</button>
            </td>
          </tr>
        ))}
    </>
  );
}

export default AssignmentTable;