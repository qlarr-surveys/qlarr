import { createSlice } from "@reduxjs/toolkit";
import { isEquivalent } from "~/utils/design/utils";

export const editState = createSlice({
  name: "editState",
  initialState: { 
    state: {},
    error: null,
    isSaving: false,
    isUpdating: false,
    // How the last save ended: "saved", "error" or "restored"; null until the
    // first one. Shared by the design and settings savers, which the header reads.
    lastSave: null,
    loading: false
  },
  reducers: {
    setSaving: (state, action) => {
      state.isSaving = action.payload;
    },
    setUpdating: (state, action) => {
      state.isUpdating = action.payload;
    },
    setLastSave: (state, action) => {
      state.lastSave = action.payload;
    },
    surveyReceived: (state, action) => {
      let survey = action.payload;
      // Another survey's last save says nothing about this one.
      if (state.survey?.id != survey?.id) {
        state.lastSave = null;
      }
      if (!isEquivalent(state.survey, survey)) {
        state.survey = survey;
      }
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    surveyAttributeChanged: (state, action) => {
      let payload = action.payload;
      state.survey[payload.key] = payload.value;
    },
    surveyAttributeChangedImmediate: (state, action) => {
      let payload = action.payload;
      state.survey[payload.key] = payload.value;
    },
    onError: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    onEditErrorSeen: (state) => {
      if (state.error) {
        state.error.seen = true;
      }
    }
  },
});

export const {
  surveyReceived,
  setSaving,
  setUpdating,
  setLastSave,
  onError,
  setLoading,
  onEditErrorSeen,
  surveyAttributeChanged,
  surveyAttributeChangedImmediate,
} = editState.actions;

export default editState.reducer;
