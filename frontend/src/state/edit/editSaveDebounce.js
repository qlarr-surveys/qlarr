import { onError, setSaving, setUpdating, surveyReceived } from "./editState";
import SurveyService from "~/services/SurveyService";

let saveTimer;
let buffer = [];
let defaultDebounceTime = 3000;

const surveyService = new SurveyService();
async function setData(store, state) {
  surveyService
    .putSurvey(state.editState.survey, state.editState.survey.id)
    .then((state) => {
      setState(store, state);
    })
    .catch((error) => {
      surveyService.getSurvey().then((state) => {
        setState(store, state);
      });
      setError(store, error);
    });
}

const saveDebounce = (store, debounceTime) => {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  saveTimer = setTimeout(() => {
    store.dispatch(setUpdating(true));
    const state = store.getState();
    setData(store, state);
  }, debounceTime);
};

export const editDataSaver = (store) => (next) => (action) => {
  if (
    action.type == "editState/surveyAttributeChanged" ||
    action.type == "editState/surveyAttributeChangedImmediate"
  ) {
    if (!store.getState().editState.isUpdating) {
      store.dispatch(setSaving(true));
      let debounceTime = defaultDebounceTime;
      if (action.type == "editState/surveyAttributeChangedImmediate") {
        debounceTime = 0;
      }
      saveDebounce(store, debounceTime);
    } else {
      buffer.push(action);
    }
  }
  return next(action);
};
const setState = (store, state) => {
  store.dispatch(setUpdating(false));
  store.dispatch(surveyReceived(state));
  store.dispatch(setSaving(false));
  buffer.forEach((action) => {
    store.dispatch(action);
  });
  store.dispatch(onError(""));
  buffer = [];
};
const setError = (store, processedError) => {
  store.dispatch(onError(processedError));
  store.dispatch(setSaving(false));
  store.dispatch(setUpdating(false));
};
