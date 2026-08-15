import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useDispatch } from "react-redux";
import { designStateReceived, resetSetup } from "~/state/design/designState";
import { GetData } from "~/networking/design";
import { setLoading, surveyReceived } from "~/state/edit/editState";
import SavingSurvey from "~/components/design/SavingSurvey";
import { availablePages, isAnalyst, isSurveyAdmin } from "~/constants/roles";
import TokenService from "~/services/TokenService";
import { useParams } from "react-router-dom";
import { MANAGE_SURVEY_LANDING_PAGES } from "~/routes";
import { Box } from "@mui/material";
import styles from "./ManageSurvey.module.css";

import LoadingDots from "~/components/common/LoadingDots";
import { useService } from "~/hooks/use-service";
import SideTabs from "~/components/design/SideTabs";
import DesignTourProvider from "~/components/design/DesignTour";

const ResponsesSurvey = React.lazy(() => import("../manage/ResponsesSurvey"));
const EditSurvey = React.lazy(() => import("../manage/EditSurvey"));
const DesignSurvey = React.lazy(() => import("../DesignSurvey"));


function ManageSurvey({ landingPage }) {
  const surveyService = useService("survey");
  const designService = useService("design");
  const params = useParams();
  const user = TokenService.getUser();
  const [selectedPage, setSelectedTab] = useState(
    landingTab(landingPage, user)
  );

  const [designAvailable, setDesignAvailable] = useState(false);

  const dispatch = useDispatch();

  const setState = (state) => {
    dispatch(designStateReceived({ ...state, overWriteLang: true }));
  };

  const processApirror = (e) => {
    dispatch(setLoading(false));
  };

  useEffect(() => {
    dispatch(resetSetup());
    if (!isSurveyAdmin(user)) {
      return;
    }
    dispatch(setLoading(true));
    GetData(designService, setState, processApirror)
      .then((data) => {
        if (data) {
          setDesignAvailable(true);
          dispatch(setLoading(false));
        }
      })
      .catch((err) => {
        dispatch(setLoading(false));
      });
    loadSurvey();
  }, []);

  const loadSurvey = () => {
    surveyService
      .getSurvey()
      .then((data) => {
        if (data) {
          dispatch(surveyReceived(data));
        }
      })
      .catch((err) => {});
  };

  useEffect(() => {
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      const currentTab = currentPath.split("/")[1];
      setSelectedTab(currentTab);
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const shouldShowDesign = () =>
    selectedPage == MANAGE_SURVEY_LANDING_PAGES.DESIGN && designAvailable;

  const shouldShowResponses = () =>
    selectedPage == MANAGE_SURVEY_LANDING_PAGES.RESPONSES;

  const shouldShowEditSurvey = () =>
    selectedPage == MANAGE_SURVEY_LANDING_PAGES.SETTINGS;


  const changePage = useCallback((tab) => {
    setSelectedTab(tab);
  }, []);

  const availablePagesMemo = useMemo(() => {
    return availablePages(user);
  }, [user]);

  const content = (
    <>
      <Box sx={{ display: "flex" }}>
        {availablePagesMemo.length > 0 && (
          <SideTabs
            availablePages={availablePagesMemo}
            selectedPage={selectedPage}
            surveyId={params.surveyId}
            onPageChange={changePage}
          />
        )}
        <Suspense fallback={<LoadingDots fullHeight />}>
          <Box className={styles.wrapper}>
            {shouldShowResponses() ? (
              <ResponsesSurvey />
            ) : shouldShowEditSurvey() ? (
              <EditSurvey onPublish={() => loadSurvey()} />
            ) : shouldShowDesign() ? (
              <DesignSurvey />
            ) : (
              <></>
            )}
          </Box>
        </Suspense>

        <SavingSurvey />
      </Box>
    </>
  );

  if (shouldShowDesign()) {
    return <DesignTourProvider>{content}</DesignTourProvider>;
  }

  return content;
}
export default React.memo(ManageSurvey);

export const landingTab = (landingPage, user) => {
  if (isAnalyst(user) && !isSurveyAdmin(user)) {
    return MANAGE_SURVEY_LANDING_PAGES.RESPONSES;
  } else if (
    isSurveyAdmin(user) &&
    (landingPage == MANAGE_SURVEY_LANDING_PAGES.DESIGN ||
      landingPage == MANAGE_SURVEY_LANDING_PAGES.SETTINGS ||
      landingPage == MANAGE_SURVEY_LANDING_PAGES.RESPONSES)
  ) {
    return landingPage;
  } else {
    return "";
  }
};
