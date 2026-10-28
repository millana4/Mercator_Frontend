// ---------- Поле черновика: сохранение по уходу из поля или Enter, ошибка под полем ----------
import { useContext, useId, useState } from 'react';
import { adminErrorText } from '../../constants/labels';
import { isNumberDraft } from '../../utils/format';
import { DraftGuardContext } from './draftGuard';
import styles from './EditableCell.module.css';

// kind: text | decimal | int. Десятичная запятая принимается.
function parse(kind, text) {
  const t = text.trim();
  if (kind === 'text') return t;
  if (t === '') return null;
  const n = kind === 'int' ? Number(t) : Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

// Поле пересоздаётся родителем по key при новом значении с сервера - эффекты не нужны.
// validate(value) -> текст ошибки или null; onSave(value) -> Promise (ошибка - HTTP-статус).
// Неверное значение остаётся в поле с ошибкой (видно, что исправить), Escape возвращает
// сохранённое. Поле с ошибкой сообщает о себе блоку черновика (DraftGuardContext).
function EditableCell({ value, kind = 'text', validate, onSave, wide = false }) {
  const original = value === null || value === undefined ? '' : String(value);
  const [text, setText] = useState(original);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const guard = useContext(DraftGuardContext);
  const id = useId();

  const showError = (message) => {
    setError(message);
    guard?.report(id, Boolean(message));
  };

  const commit = async () => {
    if (text.trim() === original) {
      showError(null);
      return;
    }
    const parsed = parse(kind, text);
    const problem = validate ? validate(parsed) : null;
    if (problem) {
      showError(problem);
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed);
      showError(null);
    } catch (status) {
      showError(adminErrorText(status));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const next = e.target.value;
    if (kind !== 'text' && !isNumberDraft(kind, next.trim())) return;   // лишние символы не вводятся
    setText(next);
  };

  return (
    <div className={styles.cell}>
      <input
        className={`${styles.input} ${wide ? styles.wide : ''} ${kind === 'decimal' ? styles.decimal : ''} ${error ? styles.invalid : ''}`}
        value={text}
        disabled={saving}
        inputMode={kind === 'text' ? undefined : 'decimal'}
        onChange={handleChange}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setText(original);
            showError(null);
          }
        }}
      />
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}

export default EditableCell;