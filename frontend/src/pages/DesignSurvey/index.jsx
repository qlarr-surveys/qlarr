import React, { Suspense, useEffect, useMemo, useRef } from "react";
import { Box, Chip, ThemeProvider, createTheme } from "@mui/material";
import styles from "./DesignSurvey.module.css";

import { defualtTheme } from "~/constants/theme";
import { useTranslation } from "react-i18next";
import useNamespaceLoader, { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { cacheRtl, rtlLanguage } from "~/utils/common";
import { CacheProvider } from "@emotion/react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";

import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { isTouchDevice } from "~/utils/isTouchDevice";
import { TouchBackend } from "react-dnd-touch-backend";
import { buildResourceUrl } from "~/networking/common";
import LoadingDots from "~/components/common/LoadingDots";
import {
  setDesignModeToDesign,
  setDesignModeToLang,
  setDesignModeToTheme,
  refreshDsl,
} from "~/state/design/designState";
import { DESIGN_SURVEY_MODE } from "~/routes";

const ContentPanel = React.lazy(() =>
  import("~/components/design/ContentPanel")
);
const LeftPanel = React.lazy(() => import("~/components/design/LeftPanel"));

function DesignSurvey() {
  useNamespaceLoader();
  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);
  const [contentElement, setContentElement] = React.useState(null);
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const contentRef = React.useCallback((node) => {
    if (node) {
      setContentElement(node);
    }
  }, []);

  const containerRef = useRef();

  const langInfo = useSelector((state) => {
    return state.designState.langInfo;
  });

  const designMode = useSelector((state) => {
    return state.designState.designMode;
  });
  const designStateReceived = useSelector((state) => {
    return state.designState.designStateReceived || false;
  });

  const lang = langInfo?.lang;

  const theme = useSelector((state) => {
    return state.designState["Survey"]?.theme;
  });

  useEffect(() => {
    if (contentElement && lang) {
      const dir = rtlLanguage.includes(lang) ? "rtl" : "ltr";
      const contentPanel = contentElement;
      if (contentPanel.dir != dir) {
        contentPanel.dir = dir;
      }
      contentPanel.scrollTop = 0;
    }
  }, [lang, contentElement]);

  useEffect(() => {
    if (designMode == DESIGN_SURVEY_MODE.LANGUAGES) {
      dispatch(setDesignModeToLang());
    } else if (designMode == DESIGN_SURVEY_MODE.THEME) {
      dispatch(setDesignModeToTheme());
    } else {
      dispatch(setDesignModeToDesign());
    }
  }, []);

  useEffect(() => {
    if (designStateReceived && searchParams.get("refresh") === "true") {
      dispatch(refreshDsl());
      searchParams.delete("refresh");
      setSearchParams(searchParams);
    }
  }, [designStateReceived]);

  const cacheRtlMemo = useMemo(() => cacheRtl(lang), [lang]);

  const surveyTheme = React.useCallback(
    createTheme({
      ...defualtTheme(theme),
      direction: rtlLanguage.includes(lang) ? "rtl" : "ltr",
    }),
    [theme]
  );

  const backgroundImage = useSelector(
    (state) => state.designState["Survey"]?.resources?.backgroundImage
  );

  const backgroundStyle = backgroundImage
    ? {
        backgroundImage: `url(${buildResourceUrl(backgroundImage)})`,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }
    : {};

  return (
    <Box
      className={styles.mainContainer}
      ref={containerRef}
      sx={backgroundStyle}
    >
      <DndProvider backend={isTouchDevice() ? TouchBackend : HTML5Backend}>
        <Suspense fallback={<LoadingDots fullHeight />}>
          <LeftPanel t={t} />
        </Suspense>
        <CacheProvider value={cacheRtlMemo}>
          <ThemeProvider theme={surveyTheme}>
            <Suspense fallback={<LoadingDots fullHeight />}>
              <ContentPanel
                designMode={designMode}
                ref={contentRef}
                className={styles.contentPanel}
              />
            </Suspense>
          </ThemeProvider>
        </CacheProvider>
      </DndProvider>
    </Box>
  );
}

export default React.memo(DesignSurvey);
