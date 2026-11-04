import { combineReducers, configureStore } from "@reduxjs/toolkit";
import runState from "~/state/runState";
import designState, {
  clearHighlighted,
  designStateReceived,
  resetSetup,
  setDesignModeToDesign,
  setup,
} from "~/state/design/designState";
import editState, { surveyReceived } from "~/state/edit/editState";
import { dataSaver } from "~/state/design/saveDebounce";
import templateState from "~/state/templateState";
import { editDataSaver } from "~/state/edit/editSaveDebounce";

export const runStore = configureStore({
  reducer: { templateState, runState },
});
export const manageStore = configureStore({
  reducer: { templateState, designState, editState },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(dataSaver, editDataSaver),
});

// The only designer actions a preview accepts: opening, closing and browsing a
// component's settings. They touch UI state only, never the design.
const PREVIEW_ACTIONS = [setup.type, resetSetup.type, clearHighlighted.type];
const PREVIEW_LOAD = "preview/load";

/** Shows another design in a preview store; only the preview page dispatches it. */
export const loadPreview = (designPayload) => ({
  type: PREVIEW_LOAD,
  payload: designPayload,
});

/**
 * A store for read-only previews: it accepts PREVIEW_ACTIONS and loadPreview,
 * ignores everything else, and saves nothing.
 */
export const createPreviewStore = (survey) => {
  const reducer = combineReducers({ templateState, designState, editState });
  const initial = [setDesignModeToDesign(), surveyReceived(survey)].reduce(
    reducer,
    undefined
  );
  return configureStore({
    reducer: (state = initial, action) => {
      if (action.type === PREVIEW_LOAD) {
        return reducer(state, designStateReceived(action.payload));
      }
      return PREVIEW_ACTIONS.includes(action.type)
        ? reducer(state, action)
        : state;
    },
  });
};
