// ---------- Настройки аналитики: черновик строк + сохранённые подписки ----------
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getCatalog, getSubscriptions, putSubscriptions } from '../../services/api';

export const fetchCatalog = createAsyncThunk('settings/fetchCatalog', async () => {
  return await getCatalog();
});

export const fetchSubscriptions = createAsyncThunk('settings/fetchSubscriptions', async () => {
  return await getSubscriptions();
});

export const saveSubscriptions = createAsyncThunk('settings/saveSubscriptions', async (rows) => {
  return await putSubscriptions(rows);
});

const toDraft = (subs) => subs.map((s) => ({
  category: s.category, marketplace: s.marketplace, geo: s.geo,
}));

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    catalog: [],
    savedSets: [],
    draftRows: [],
    dirty: false,
    dupMessage: null,
    saveError: null,
  },
  reducers: {
    addRow: (state) => {
      state.draftRows.push({ category: '', marketplace: '', geo: '' });
      state.dirty = true;
      state.dupMessage = null;
    },
    removeRow: (state, action) => {
      state.draftRows.splice(action.payload, 1);
      state.dirty = true;
      state.dupMessage = null;
    },
    updateRow: (state, action) => {
      const { index, field, value } = action.payload;
      const row = state.draftRows[index];
      row[field] = value;

      if (field === 'category') {
        const marketplaces = [...new Set(
          state.catalog.filter((c) => c.category === value).map((c) => c.marketplace),
        )];
        row.marketplace = marketplaces.length === 1 ? marketplaces[0] : '';
      }

      if (field === 'category' || field === 'marketplace') {
        const geos = row.marketplace
          ? [...new Set(
              state.catalog
                .filter((c) => c.category === row.category && c.marketplace === row.marketplace)
                .map((c) => c.geo),
            )]
          : [];
        row.geo = geos.length === 1 ? geos[0] : '';
      }

      state.dirty = true;
      state.dupMessage = null;
    },
    setSaveError: (state, action) => {
      state.saveError = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCatalog.fulfilled, (state, action) => {
        state.catalog = action.payload;
      })
      .addCase(fetchSubscriptions.fulfilled, (state, action) => {
        state.savedSets = action.payload;
        state.draftRows = toDraft(action.payload);
        state.dirty = false;
      })
      .addCase(saveSubscriptions.pending, (state) => {
        state.saveError = null;
      })
      .addCase(saveSubscriptions.fulfilled, (state, action) => {
        const sentCount = action.meta.arg.length;
        const savedCount = action.payload.length;
        state.dupMessage = savedCount < sentCount ? 'Дубли в настройках удалены.' : null;
        state.savedSets = action.payload;
        state.draftRows = toDraft(action.payload);
        state.dirty = false;
      })
      .addCase(saveSubscriptions.rejected, (state) => {
        state.saveError = 'Не удалось сохранить настройки.';
        state.dupMessage = null;
      });
  },
});

export const { addRow, removeRow, updateRow, setSaveError } = settingsSlice.actions;
export default settingsSlice.reducer;