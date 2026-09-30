// ---------- Товарные ниши: доступные, лимит, создание, удаление ----------
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getNiches, getNicheLimits, createNiche, deleteNiche } from '../../services/api';

// Текст для пользователя: причину отказа бэкенд отдаёт в detail строкой.
// У ошибок валидации FastAPI (422) detail - массив, тогда берём общий текст.
const errorText = (err, fallback) => {
  const detail = err?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
};

export const fetchNiches = createAsyncThunk('niches/fetchNiches', async () => {
  return await getNiches();
});

export const fetchNicheLimits = createAsyncThunk('niches/fetchNicheLimits', async () => {
  return await getNicheLimits();
});

export const addNiche = createAsyncThunk('niches/addNiche', async (payload, { rejectWithValue }) => {
  try {
    return await createNiche(payload);
  } catch (err) {
    return rejectWithValue(errorText(err, 'Не удалось добавить нишу.'));
  }
});

export const removeNiche = createAsyncThunk('niches/removeNiche', async (id, { rejectWithValue }) => {
  try {
    await deleteNiche(id);
    return id;
  } catch (err) {
    return rejectWithValue(errorText(err, 'Не удалось удалить нишу.'));
  }
});

const nichesSlice = createSlice({
  name: 'niches',
  initialState: {
    items: [],            // доступные ниши (GET /niches), новые сверху
    limits: null,         // { used, limit, is_internal }
    creating: false,
    createError: null,
    createdStatus: null,  // статус только что добавленной ниши: submitted | pending
    deleteError: null,
  },
  reducers: {
    clearCreateResult: (state) => {
      state.createError = null;
      state.createdStatus = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNiches.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(fetchNicheLimits.fulfilled, (state, action) => {
        state.limits = action.payload;
      })
      .addCase(addNiche.pending, (state) => {
        state.creating = true;
        state.createError = null;
        state.createdStatus = null;
      })
      .addCase(addNiche.fulfilled, (state, action) => {
        state.creating = false;
        state.items.unshift(action.payload);
        state.createdStatus = action.payload.status;
        if (state.limits) state.limits.used += 1;
      })
      .addCase(addNiche.rejected, (state, action) => {
        state.creating = false;
        state.createError = action.payload || 'Не удалось добавить нишу.';
      })
      .addCase(removeNiche.pending, (state) => {
        state.deleteError = null;
      })
      .addCase(removeNiche.fulfilled, (state, action) => {
        state.items = state.items.filter((n) => n.id !== action.payload);
        // удалить можно только свою нишу, поэтому место в лимите освобождается всегда
        if (state.limits) state.limits.used = Math.max(0, state.limits.used - 1);
      })
      .addCase(removeNiche.rejected, (state, action) => {
        state.deleteError = action.payload || 'Не удалось удалить нишу.';
      });
  },
});

export const { clearCreateResult } = nichesSlice.actions;
export default nichesSlice.reducer;