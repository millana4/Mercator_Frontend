// ---------- Управление сетами: сеты связки, задание активного сета, черновик ----------
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getAdminOverview, getAdminSet, createAdminDraft, patchAdminDraft,
  addAdminSubcategory, patchAdminSubcategory, deleteAdminSubcategory,
  addAdminStratum, patchAdminStratum, deleteAdminStratum,
  startAdminCollecting, deleteAdminDraft,
} from '../../services/api';

// Правки черновика: каждая возвращает задание черновика с пересчитанными количествами
const DRAFT_EDITS = {
  draft: patchAdminDraft,
  addSubcategory: addAdminSubcategory,
  subcategory: patchAdminSubcategory,
  deleteSubcategory: deleteAdminSubcategory,
  addStratum: addAdminStratum,
  stratum: patchAdminStratum,
  deleteStratum: deleteAdminStratum,
};

// В rejectWithValue - HTTP-статус: текст ошибки подбирает фронтенд (ADMIN_ERROR_TEXT)
const withStatus = (call) => async (arg, { rejectWithValue }) => {
  try {
    return await call(arg);
  } catch (err) {
    return rejectWithValue(err?.response?.status ?? null);
  }
};

export const fetchOverview = createAsyncThunk('admin/fetchOverview', withStatus(getAdminOverview));
export const fetchActiveView = createAsyncThunk('admin/fetchActiveView', withStatus(getAdminSet));
export const fetchDraftView = createAsyncThunk('admin/fetchDraftView', withStatus(getAdminSet));
export const createDraft = createAsyncThunk('admin/createDraft', withStatus(createAdminDraft));
export const startCollecting = createAsyncThunk('admin/startCollecting', withStatus(startAdminCollecting));
export const removeDraft = createAsyncThunk('admin/removeDraft', withStatus(deleteAdminDraft));
// { action, args } - action из DRAFT_EDITS; ошибку показывает поле, а не страница
export const editDraft = createAsyncThunk(
  'admin/editDraft',
  withStatus(({ action, args }) => DRAFT_EDITS[action](...args)),
);

const pageError = (state, action) => {
  state.busy = false;
  state.error = action.payload ?? 0;
};

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    overview: null,
    activeView: null,
    draftView: null,
    busy: false,
    error: null,       // HTTP-статус ошибки действия страницы; 0 - нет ответа
  },
  reducers: {
    clearAdminError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOverview.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchOverview.fulfilled, (state, action) => {
        state.overview = action.payload;
      })
      .addCase(fetchOverview.rejected, pageError)
      .addCase(fetchActiveView.fulfilled, (state, action) => {
        state.activeView = action.payload;
      })
      .addCase(fetchActiveView.rejected, pageError)
      .addCase(fetchDraftView.fulfilled, (state, action) => {
        state.draftView = action.payload;
      })
      .addCase(fetchDraftView.rejected, pageError)
      .addCase(editDraft.fulfilled, (state, action) => {
        state.draftView = action.payload;
      })
      .addMatcher(
        (action) => [createDraft.pending, startCollecting.pending, removeDraft.pending]
          .some((thunk) => thunk.match(action)),
        (state) => {
          state.busy = true;
          state.error = null;
        },
      )
      .addMatcher(
        (action) => [createDraft.fulfilled, startCollecting.fulfilled, removeDraft.fulfilled]
          .some((thunk) => thunk.match(action)),
        (state, action) => {
          state.busy = false;
          state.draftView = createDraft.fulfilled.match(action) ? action.payload : null;
        },
      )
      .addMatcher(
        (action) => [createDraft.rejected, startCollecting.rejected, removeDraft.rejected]
          .some((thunk) => thunk.match(action)),
        pageError,
      );
  },
});

export const { clearAdminError } = adminSlice.actions;
export default adminSlice.reducer;