import React, { useEffect, useMemo, useRef } from "react";
import { shallowEqual, useDispatch, useStore } from "react-redux";
import styles from "./RunSurvey.module.css";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { CacheProvider, css } from "@emotion/react";
import {
  loadScript,
  startNavigation,
  continueNavigation,
} from "~/networking/run";
import { cacheRtl, rtlLanguage } from "~/utils/common";
import { defualtTheme } from "~/constants/theme";
import { getValues, previewModeChange, stateReceived } from "~/state/runState";
import { useSelector } from "react-redux";
import { Box, Button, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { setFetching } from "~/state/templateState";
import Survey from "~/components/run/Survey";
import { PROCESSED_ERRORS } from "~/utils/errorsProcessor";
import ErrorLayout from "~/components/common/ErrorLayout";
import { useService } from "~/hooks/use-service";
import { buildResourceUrl } from "~/networking/common";
import Image from "~/components/image/image";
import CompactLayout from "~/layouts/compact";
import { isEquivalent } from "~/utils/design/utils";
import RunLoadingDots from "~/components/common/RunLoadingDots";
import { qlarrCssVars } from "~/components/Questions/qlarrVars";

import SurveyDrawer, { COLLAPSE, EXPAND } from "~/components/run/SurveyDrawer";
import SurveyAppBar from "~/components/run/SurveyAppBar";
import PreviewEndActions from "~/components/run/PreviewEndActions";
import { getClosestScrollableParent } from "~/components/run/Navigation";
import { routes } from "~/routes";

function RunSurvey({
  preview,
  mode,
  resume = false,
  responseId,
  navigationMode,
}) {
  const runService = useService("run");
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const lang = searchParams.get("lang");
  const [render, setRender] = React.useState(false);
  const [expanded, setExpanded] = React.useState(COLLAPSE);
  const [error, setError] = React.useState(false);
  const [inlineError, setInlineError] = React.useState(false);
  const [currentMode, setCurrentMode] = React.useState(mode);
  const [currentNavigationMode, setCurrentNavigationMode] =
    React.useState(navigationMode);
  const [pendingScrollTarget, setPendingScrollTarget] = React.useState(null);
  const containerRef = useRef(null);

  const store = useStore()

  const surveyTheme = useSelector((state) => {
    return state.runState.data?.survey?.theme;
  }, isEquivalent);

  const navResponseId = useSelector((state) => {
    return state.runState.data?.responseId;
  });

  const navigationIndex = useSelector((state) => {
    return state.runState.data?.navigationIndex;
  }, shallowEqual);
  const SURVEY_ENDED = navigationIndex?.name === "end";

  const backgroundImage = useSelector((state) => {
    return state.runState.data?.survey?.resources?.backgroundImage;
  });

  const navigation = useSelector((state) => {
    return state.runState.navigation;
  }, isEquivalent);

  const { t, i18n } = useTranslation(NAMESPACES.RUN);
  const dispatch = useDispatch();

  useEffect(() => {
    if (navigation) {
      continueNav(navigation, navResponseId);
    }
  }, [navigation]);

  useEffect(() => {
    if (window["Android"]) {
      window["autoSaveValues"] = ()=>{
        const valuesToSave = {
          events: store.getState().runState.timings,
          values: getValues(store.getState().runState.values)
        }
        window["Android"].autoSaveValues(JSON.stringify(valuesToSave))

      }
    }
  }, []);

  useEffect(() => {
    if (preview) {
      const handleMessage = (event) => {
        // Always verify the origin for security
        if (
          event.origin !== window.location.origin ||
          event.data.type !== "PREVIEW_MODE_CHANGED"
        ) {
          return;
        }

        const mode = event.data.mode;
        const navigationMode = event.data.navigationMode;
        dispatch(
          previewModeChange({ mode: mode, navigationMode: navigationMode })
        );
      };

      window.addEventListener("message", handleMessage);

      // Cleanup listener on component unmount
      return () => {
        window.removeEventListener("message", handleMessage);
      };
    }
  }, []);

  useEffect(() => {
    if (rtlLanguage.includes(i18n.language)) {
      document.dir = "rtl";
    } else {
      document.dir = "ltr";
    }
  }, [i18n.language]);

  const handleError = (procesed) => {
    if (
      [
        PROCESSED_ERRORS.SURVEY_DESIGN_ERROR,
        PROCESSED_ERRORS.SURVEY_NOT_ACTIVE,
        PROCESSED_ERRORS.SURVEY_CLOSED,
        PROCESSED_ERRORS.SURVEY_EXPIRED,
        PROCESSED_ERRORS.SURVEY_SCHEDULED,
      ].indexOf(procesed) > -1
    ) {
      setInlineError(procesed);
    } else {
      setError(procesed);
    }
    dispatch(setFetching(false));
  };

  const startNav = () => {
    startNavigation(runService, lang, preview, mode, navigationMode)
      .then(async (response) => {
        // Change language and load namespace before rendering
        // This ensures translations are loaded for the correct language only
        if (i18n.language !== response.lang.code) {
          await i18n.changeLanguage(response.lang.code);
        }
        // Load 'run' namespace if not already loaded (lazy loading)
        if (!i18n.hasLoadedNamespace('run')) {
          await i18n.loadNamespaces('run');
        }

        setRender(true);
        dispatch(stateReceived({ response, preview }));
        if (preview) {
          window.parent.postMessage(
            {
              type: "RESPONSE_ID_RECEIVED",
              responseId: response.responseId,
            },
            window.location.origin
          );
        } else {
          window.history.replaceState(
            {},
            "",
            routes.resumeSurvey
              .replace(":surveyId", sessionStorage.getItem("surveyId"))
              .replace(":responseId", response.responseId)
          );
        }
        sessionStorage.setItem("responseId", response.responseId);
        dispatch(setFetching(false));
      })
      .catch((err) => {
        console.error(err);
        handleError(err);
      });
  };

  const continueNav = (payload, responseId) => {
    dispatch(setFetching(true));
    if (payload.mode) {
      setCurrentMode(payload.mode);
    }
    if (payload.navigationMode) {
      setCurrentNavigationMode(payload.navigationMode);
    }

    const useCaseMode = payload.mode ?? currentMode;
    const useCaseNavMode = payload.navigationMode ?? currentNavigationMode;
    continueNavigation(
      runService,
      payload,
      responseId,
      preview,
      useCaseMode,
      useCaseNavMode
    )
      .then(async (response) => {
        // Change language and load namespace before rendering
        if (i18n.language !== response.lang.code) {
          await i18n.changeLanguage(response.lang.code);
        }
        // Load 'run' namespace if not already loaded (lazy loading)
        if (!i18n.hasLoadedNamespace('run')) {
          await i18n.loadNamespaces('run');
        }

        setRender(true);
        dispatch(stateReceived({ response, preview }));
        sessionStorage.setItem("responseId", response.responseId);
        dispatch(setFetching(false));
      })
      .catch((err) => {
        console.error(err);
        handleError(err);
      });
  };

  useEffect(() => {
    if (navigation || !containerRef.current) return;
    if (!pendingScrollTarget) {
      containerRef.current.scrollTo({ top: 0 });
      return;
    }
    const delays = [50, 150, 400];
    let cancelled = false;
    const tryScroll = (i) => {
      if (cancelled) return;
      const el = document.querySelector(
        `[data-code="${pendingScrollTarget}"]`,
      );
      if (el) {
        const container = getClosestScrollableParent(el);
        if (container && container !== document.documentElement) {
          container.scrollTo({
            top: el.offsetTop - container.offsetTop,
            behavior: "smooth",
          });
        }
        // No scrollable ancestor → content already fits the viewport, so the
        // element is visible without scrolling. Skip rather than call
        // el.scrollIntoView, which propagates to the parent window when this
        // runs inside the preview iframe and pushes the preview-mode-tabs
        // off-screen.
        setPendingScrollTarget(null);
        return;
      }
      if (i >= delays.length) {
        if (import.meta.env?.DEV) {
          console.warn(
            `RunSurvey: pending scroll target "${pendingScrollTarget}" never mounted; giving up after ${delays.reduce((a, b) => a + b, 0)}ms.`,
          );
        }
        setPendingScrollTarget(null);
        return;
      }
      setTimeout(() => tryScroll(i + 1), delays[i]);
    };
    tryScroll(0);
    return () => {
      cancelled = true;
    };
  }, [navigation, pendingScrollTarget]);

  useEffect(() => {
    document.body.style.overflow = "visible";
    dispatch(setFetching(true));
    loadScript(runService, preview)
      .then(() => {
        if (resume) {
          continueNav({ navigationDirection: { name: "RESUME" } }, responseId);
        } else {
          startNav();
        }
      })
      .catch((err) => {
        handleError(err);
      });
  }, []);

  const theme = useMemo(
    () =>
      createTheme({
        ...defualtTheme(surveyTheme),
        direction: rtlLanguage.includes(i18n.language) ? "rtl" : "ltr",
      }),
    [i18n.language, surveyTheme]
  );

  const cacheRtlMemo = useMemo(() => cacheRtl(i18n.language), [i18n.language]);
  const backgroundImageUrl = useMemo(
    () => `url(${buildResourceUrl(backgroundImage)})`,
    [backgroundImage]
  );

  const navigate = useNavigate();

  const toggleDrawer = (open) => (event) => {
    if (
      event?.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }
    setExpanded(open ? EXPAND : COLLAPSE);
  };

  return (
    <>
      <CacheProvider value={cacheRtlMemo}>
        <ThemeProvider theme={theme}>
          {error && (
            <ErrorLayout
              error={error}
              setErrorSeen={() => {
                setError(null);
              }}
            />
          )}
          {render && (
            <>
              {backgroundImage && (
                <div
                  aria-hidden
                  className={styles.fixedBg}
                  css={css`
                    background-image: ${backgroundImageUrl};
                  `}
                />
              )}
              <div
                className={styles.mainContainer}
                ref={containerRef}
                css={css`color: ${theme.textStyles.text.color};
                    font-family: ${theme.textStyles.text.font};`}
                style={{
                  backgroundColor: theme.palette.background.default,
                  height: "calc(100vh - 48px)",
                  ...qlarrCssVars(theme),
                }}
              >
                {!SURVEY_ENDED && (
                  <SurveyAppBar preview={preview} toggleDrawer={toggleDrawer} />
                )}
                <SurveyMemo
                  key="Survey"
                />
                {preview && SURVEY_ENDED && <PreviewEndActions />}
                <SurveyDrawer
                  expanded={expanded}
                  toggleDrawer={toggleDrawer}
                  t={t}
                  onPendingScrollTarget={setPendingScrollTarget}
                />
              </div>
            </>
          )}
          <RunLoadingDots />
        </ThemeProvider>
      </CacheProvider>
      {inlineError && (
        <Box style={{ height: "100%", overflow: "auto" }}>
          <CompactLayout>
            <Typography variant="h3" paragraph>
              {t("error")}
            </Typography>
            <Typography sx={{ color: "text.secondary" }}>
              {t("processed_errors." + inlineError.name)}
            </Typography>
            <Image
              alt="500"
              src="/illustration_500.svg"
              sx={{
                mx: "auto",
                maxWidth: 320,
                my: { xs: 5, sm: 8 },
              }}
            />
            <Button
              fullWidth
              size="large"
              color="inherit"
              variant="contained"
              className={styles.goBack}
              onClick={() => navigate(-1)}
            >
              {t("goBack")}
            </Button>
          </CompactLayout>
        </Box>
      )}
    </>
  );
}

const SurveyMemo = React.memo(Survey);

export default RunSurvey;
