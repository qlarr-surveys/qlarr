import createCache from "@emotion/cache";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";
import { setDayjsLocale } from "./format-time";

export const rtlLanguage = ["ar"];

export const isAndroid = import.meta.env.MODE == "android-debuggable" || import.meta.env.MODE == "android";

export const setLangFromSession = (i18n) => {
  const lang = localStorage.getItem("lang");
  if (!lang) {
    return;
  }
  lang && i18n.changeLanguage(lang);
  setDocumentLang(lang);
  setDayjsLocale(lang);
};

export const setDocumentLang = (lang) => {
  const dir = rtlLanguage.includes(lang) ? "rtl" : "ltr";
  document.documentElement.setAttribute("lang", lang);
  document.dir = dir;
};

export const getDirFromSession = () => {
  const lang = localStorage.getItem("lang");
  return rtlLanguage.includes(lang) ? "rtl" : "ltr";
};

export const isSessionRtl = () =>{
  return getDirFromSession() == "rtl" ;
}

export const cacheRtl = (lang) =>
  createCache({
    key: rtlLanguage.includes(lang) ? "muirtl" : "muiltr",
    stylisPlugins: rtlLanguage.includes(lang) ? [prefixer, rtlPlugin] : null,
  });
