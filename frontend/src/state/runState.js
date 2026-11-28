import { createSelector, createSlice, current } from "@reduxjs/toolkit";

let qlarrDependents = {};

export const runState = createSlice({
  name: "runState",
  initialState: { state: {} },
  reducers: {
    valueChange: (state, action) => {
      setValueInState(state, action.payload);
    },
    valueMetaChange: (state, action) => {
      setValueMetaInState(state, action.payload);
    },
    orderChange: (state, action) => {
      let keys = Object.keys(action.payload);
      if (!state.order) {
        state.order = {};
      }
      keys.forEach((key) => (state.order[key] = action.payload[key]));
    },
    stateReceived: (state, action) => {
      const uploading = state.uploading;
      let keys = Object.keys(state);
      keys.forEach((key) => delete state[key]);
      state.uploading = uploading;
      state.preview = action.payload.preview;
      state.singleQuestion = !!action.payload.singleQuestion;
      let response = action.payload.response;
      qlarrDependents = response.state.qlarrDependents;
      state.navigation = undefined;
      state.data = {
        survey: response.survey,
        navigationIndex: response.navigationIndex,
        navigationData: response.navigationData,
        additionalLang: response.additionalLang,
        lang: response.lang,
        responseId: response.responseId,
        screenedOutQuota: response.screenedOutQuota,
        previewInputs: response.previewInputs ?? [],
      };
      state.saveTimings = response.saveTimings
      state.values = response.state.qlarrVariables;
    },
    langChange: (state, action) => {
      state.navigation = {
        events: state.timings,
        values: getValues(state.values),
        lang: action.payload.lang,
        navigationDirection: { name: "RESUME" },
      };
    },
    previewModeChange: (state, action) => {
      state.navigation = {
        events: state.timings,
        values: getValues(state.values),
        mode: action.payload.mode,
        navigationMode: action.payload.navigationMode,
        navigationDirection: { name: "RESUME" },
      };
    },
    uploadStarted: (state, action) => {
      state.uploading = { ...state.uploading, [action.payload]: true };
    },
    uploadFinished: (state, action) => {
      delete state.uploading?.[action.payload];
    },
    navigateNext: (state) => {
      next(state);
    },
    navigatePrevious: (state) => {
      previous(state);
    },
    jump: (state, action) => {
      if (Object.keys(state.uploading ?? {}).length) return;
      state.navigation = {
        events: state.timings,
        values: getValues(state.values),
        navigationDirection: { name: "JUMP", navigationIndex: action.payload },
      };
    },
  },
});

export const {
  valueChange,
  valueMetaChange,
  orderChange,
  stateReceived,
  langChange,
  previewModeChange,
  uploadStarted,
  uploadFinished,
  navigateNext,
  navigatePrevious,
  jump,
} = runState.actions;

export default runState.reducer;

export const uploadInProgress = (state) =>
  Object.keys(state.runState.uploading ?? {}).length > 0;

// The question shown by a single-question preview. It stays on screen whatever
// its relevance says, so the designer can see it under any answers.
export const previewTarget = (state) =>
  state.runState.singleQuestion
    ? state.runState.data?.navigationIndex?.questionId
    : null;

function setValueInState(state, payload) {
  let componentCode = payload.componentCode;
  logTimes(state, componentCode);
  let value = payload.value;
  let element = state.values[componentCode];
  if (typeof element !== "undefined" && element["value"] !== value) {
    let time = Date.now();
    window.qlarrStateMachine(
      state.values,
      qlarrDependents,
      window.qlarrRuntime,
      componentCode,
      "value",
      value,
      "VALUE CHANGE"
    );
    console.debug("NEW STATE in: " + (Date.now() - time) + " millis");
  }
}

// `value_meta`: a client-set object kept with a component's answer (a
// hierarchical autocomplete's selected row, in every language). Saved with the
// response and sent on navigation; only masked_value / format instructions read it.
function setValueMetaInState(state, payload) {
  let componentCode = payload.componentCode;
  let valueMeta = payload.valueMeta;
  let element = state.values[componentCode];
  if (typeof element !== "undefined" && element["value_meta"] !== valueMeta) {
    window.qlarrStateMachine(
      state.values,
      qlarrDependents,
      window.qlarrRuntime,
      componentCode,
      "value_meta",
      valueMeta,
      "VALUE CHANGE"
    );
  }
}

function logTimes(state, code) {
  if (!state.saveTimings) {
    return;
  }
  if (!state.timings) {
    state.timings = [];
  }
  let element = {
    code,
    time: new Date().toISOString().split(".")[0].replace("T", " "),
    name: "ValueTiming",
  };

  if (
    state.timings.length > 0 &&
    state.timings[state.timings.length - 1].code === code
  ) {
    state.timings[state.timings.length - 1] = element;
  } else {
    state.timings.push(element);
  }
}

function next(state) {
  // With skipInvalid, the first Next on an invalid page only shows the errors;
  // the next one lets the engine decide: it moves past an invalid page but
  // won't submit an invalid survey.
  const warned =
    state.data.navigationData.skipInvalid && state.values.Survey.show_errors;
  if (!state.values.Survey.validity && !warned) {
    state.values.Survey.show_errors = true;
    state.invalidNextAttempts = (state.invalidNextAttempts ?? 0) + 1;
  } else {
    state.values.Survey.show_errors = false;
    state.navigation = {
      events: state.timings,
      values: getValues(state.values),
      navigationDirection: { name: "NEXT" },
    };
  }
}

function previous(state) {
  state.navigation = {
    events: state.timings,
    values: getValues(state.values),
    navigationDirection: { name: "PREV" },
  };
}

export function getValues(values) {
  let retrunObj = {};
  for (var key in values) {
    if (values.hasOwnProperty(key)) {
      let element = values[key];
      if (element.hasOwnProperty("value")) {
        let value = element["value"];
        if (typeof value !== "undefined") {
          retrunObj[key + ".value"] = value;
        } else {
          retrunObj[key + ".value"] = null;
        }
      }
      if (element.hasOwnProperty("value_meta")) {
        retrunObj[key + ".value_meta"] = element["value_meta"] ?? {};
      }
    }
  }
  return retrunObj;
}
