import React, { Suspense, lazy } from "react";
import i18next from "i18next";
import { I18nextProvider } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import LoadingDots from "./components/common/LoadingDots";
import { isAndroid } from "./utils/common";
import { setDayjsLocale } from "./utils/format-time";

const Web = isAndroid ? null : lazy(() => import("./Web"));
const Android = isAndroid ? lazy(() => import("./Android")) : null;

// Determine context for i18next initialization
const isAndroidMode = import.meta.env.MODE === "android-debuggable" || import.meta.env.MODE === "android";
const isRunContext = window.location.pathname.includes('preview-survey') ||
                     window.location.pathname.includes('run-survey');

// Determine which namespace to load initially
const getInitialNamespace = () => {
  if (isAndroidMode) return "run";
  // In run context (web), don't preload namespace - let RunSurvey load it lazily
  // after knowing the survey's actual language to avoid loading translations twice
  if (isRunContext) return null;
  return "manage";
};

// Initialize i18next synchronously before any component renders
if (!i18next.isInitialized) {
  const initialNS = getInitialNamespace();

  // For run context (iframe), don't preload any namespace or language
  // RunSurvey will set the language and load 'run' namespace after fetching the survey
  const i18nConfig = {
    fallbackLng: 'en', // Fall back to English to prevent showing raw translation keys
    ns: initialNS ? [initialNS] : [],
    defaultNS: initialNS || 'run',
    partialBundledLanguages: true,
    interpolation: { escapeValue: false },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    supportedLngs: ["en", "ar", "de", "es", "pt", "fr", "nl"],
    load: "currentOnly",
  };

  if (isRunContext) {
    // Run context: don't set a language - RunSurvey will set it after API response
    // This prevents loading translations for the wrong language initially
    i18nConfig.lng = 'en'; // Minimal init, no namespace will be loaded since ns is empty
  } else {
    // Other contexts: use language detection
    i18nConfig.detection = {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "lang", // Use "lang" key instead of default "i18nextLng"
      caches: ["localStorage"],
      cacheUserLanguage: false, // Don't auto-save to localStorage (app handles this)
    };
  }

  i18next
    .use(HttpBackend)
    .use(LanguageDetector)
    .init(i18nConfig);

  if (!isAndroidMode) {
    setDayjsLocale(localStorage.getItem("lang") || 'en');
  }
}

function App() {
  if (isAndroidMode) {
    return (
      <I18nextProvider i18n={i18next}>
        <Suspense fallback={<LoadingDots fullHeight />}>
          <Android />
        </Suspense>
      </I18nextProvider>
    );
  }

  return (
    <I18nextProvider i18n={i18next}>
      <Suspense fallback={<LoadingDots fullHeight />}>
        <Web />
      </Suspense>
    </I18nextProvider>
  );
}

export default App;
