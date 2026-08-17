import { createSlice } from "@reduxjs/toolkit";
import { isEquivalent } from "~/utils/design/utils";

export const editState = createSlice({
  name: "editState",
  initialState: { 
    state: {},
    error: null,
    isSaving: false,
    isUpdating: false,
    loading: false
  },
  reducers: {
    setSaving: (state, action) => {
      state.isSaving = action.payload;
    },
    setUpdating: (state, action) => {
      state.isUpdating = action.payload;
    },
    surveyReceived: (state, action) => {
      let survey = action.payload;
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
  onError,
  setLoading,
  onEditErrorSeen,
  surveyAttributeChanged,
  surveyAttributeChangedImmediate,
} = editState.actions;

export default editState.reducer;
