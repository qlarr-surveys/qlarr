import React, { Suspense } from "react";
import { useParams } from "react-router-dom";
import { Provider } from "react-redux";
import { runStore } from "./store";
import { getparam } from "./networking/run";
import RunSurvey from './pages/RunSurvey';

function Android() {
  const surveyId = getparam(useParams(), "surveyId");
  sessionStorage.setItem("surveyId", surveyId);
  return (
    <Provider store={runStore}>
      <RunSurvey />
    </Provider>
  );
}
export default Android;
