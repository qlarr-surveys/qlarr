import React, { useEffect, useMemo, useState } from "react";
import { cacheRtl, setLangFromSession } from "~/utils/common";
import { CacheProvider } from "@emotion/react";
import { useTranslation } from "react-i18next";
import { Provider } from "react-redux";
import { manageStore } from "~/store";
import { Header } from "~/components/manage/Header";
import ErrorWrapper from "~/components/design/ErrorWrapper";
import { StatefulLoadingIndicator } from "~/components/common/LoadingIndicator";
import ThemeProvider from "~/theme";
import UnsupportedView from "../UnsupportedView";
import useNamespaceLoader, { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { HEADER_OPTIONS } from "./headerOptions";
import { useParams } from "react-router-dom";

const MIN_WIDTH = 768;
// Low enough for a laptop with devtools docked, high enough to rule out
// phones in landscape.
const MIN_HEIGHT = 450;

const isScreenSupported = () =>
  window.innerWidth >= MIN_WIDTH && window.innerHeight >= MIN_HEIGHT;

const ManagePageWrapper = ({
  headerOptions = HEADER_OPTIONS.GENERAL,
  children,
  resolveSurveyId = false,
  // For pages that work on a phone (auth pages, dashboard, profile, users):
  // skip the screen-size gate and let the page scroll.
  allowSmallScreens = false,
}) => {
  if (resolveSurveyId) {
    sessionStorage.setItem("surveyId", useParams().surveyId);
  }
  const lang = localStorage.getItem("lang");

  const { i18n } = useTranslation(NAMESPACES.MANAGE);

  // Load namespaces based on current route
  useNamespaceLoader();

  const [isSupportedScreenSize, setIsSupportedScreenSize] =
    useState(isScreenSupported);

  useEffect(() => {
    document.body.style.overflow = allowSmallScreens ? "" : "hidden";
    setLangFromSession(i18n);
  }, [lang, allowSmallScreens]);

  const cacheRtlMemo = useMemo(() => cacheRtl(lang), [lang]);

  useEffect(() => {
    const checkScreenSize = () => setIsSupportedScreenSize(isScreenSupported());

    window.addEventListener("resize", checkScreenSize);

    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, []);

  if (!allowSmallScreens && !isSupportedScreenSize) {
    return <UnsupportedView />;
  }

  return (
    <CacheProvider value={cacheRtlMemo}>
      <Provider store={manageStore}>
        <ThemeProvider>
          {headerOptions.showHeader && <Header headerOptions={headerOptions} />}
          <ErrorWrapper />
          <StatefulLoadingIndicator />
          {children}
        </ThemeProvider>
      </Provider>
    </CacheProvider>
  );
};

export default ManagePageWrapper;
