import { configureStore } from "@reduxjs/toolkit";
import runState from "~/state/runState";
import designState from "~/state/design/designState";
import editState from "~/state/edit/editState";
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
