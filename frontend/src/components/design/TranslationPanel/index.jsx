import React from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { LANGUAGE_DEF } from "@qlarr/design-core/constants/language";
import {
  changeLang,
  onAdditionalLangAdded,
  onAdditionalLangRemoved,
  onBaseLangChanged,
} from "~/state/design/designState";
import { rtlLanguage } from "~/utils/common";
import CheckBox from "./CheckBox";
import TranslationsCsv from "./TranslationsCsv";
import { languageGloss, languageLabel } from "./languageName";
import styles from "./TranslationPanel.module.css";

const LANGUAGE_CODES = Object.keys(LANGUAGE_DEF);

const dirOf = (code) => (rtlLanguage.includes(code) ? "rtl" : "ltr");

/**
 * The Translation workspace's left panel: which language the survey is written
 * in, which languages it is translated into, which of them the canvas beside
 * the panel is currently showing, and the CSV round-trip for translating
 * elsewhere.
 *
 * Every control writes straight to the survey — the canvas is the preview, so
 * there is no draft and nothing to save.
 */
function TranslationPanel({ t }) {
  const { i18n } = useTranslation();
  const dispatch = useDispatch();

  const mainLang = useSelector((state) => state.designState.langInfo?.mainLang);
  const lang = useSelector((state) => state.designState.langInfo?.lang);
  const languagesList = useSelector(
    (state) => state.designState.langInfo?.languagesList
  );

  const uiLang = i18n.language;
  const surveyLangs = languagesList || [];
  const additional = React.useMemo(
    () => surveyLangs.filter((language) => language.code !== mainLang),
    [surveyLangs, mainLang]
  );
  const additionalCodes = additional.map((language) => language.code);

  // Which languages a survey has is only known once its design has loaded, and
  // there is no sensible default to show in the meantime.
  if (!mainLang) {
    return null;
  }

  const toggleAdditional = (code) => {
    const language = LANGUAGE_DEF[code];
    if (additionalCodes.includes(code)) {
      dispatch(onAdditionalLangRemoved(language));
    } else {
      dispatch(onAdditionalLangAdded(language));
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.headTitle}>{t("survey_languages")}</h2>
        <p className={styles.headHint}>{t("languages_panel_hint")}</p>
      </div>

      <div className={styles.sections}>
        <section className={styles.group}>
          <label htmlFor="primary-lang" className={styles.groupTitle}>
            {t("lang_primary")}
          </label>
          <p className={styles.groupHint}>{t("lang_primary_hint")}</p>
          {/* The direction sits on the wrapper so the chevron follows the
              language the select is showing, not the interface language. */}
          <div className={styles.selectWrap} dir={dirOf(mainLang)}>
            <select
              id="primary-lang"
              value={mainLang || ""}
              onChange={(event) =>
                dispatch(onBaseLangChanged(LANGUAGE_DEF[event.target.value]))
              }
              className={styles.select}
            >
              {LANGUAGE_CODES.map((code) => (
                <option key={code} value={code}>
                  {languageLabel(code, uiLang)}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              size={14}
              strokeWidth={1.6}
              className={styles.chevron}
            />
          </div>
        </section>

        <div className={styles.divider} />

        <section className={styles.group}>
          <h3 className={styles.groupTitle}>{t("lang_additional")}</h3>
          <p className={styles.groupHint}>{t("lang_additional_hint")}</p>
          <div
            role="group"
            aria-label={t("lang_additional")}
            className={styles.rows}
          >
            {LANGUAGE_CODES.filter((code) => code !== mainLang).map((code) => {
              const on = additionalCodes.includes(code);
              const gloss = languageGloss(code, uiLang);
              return (
                <button
                  key={code}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  aria-label={languageLabel(code, uiLang)}
                  onClick={() => toggleAdditional(code)}
                  className={styles.langRow}
                >
                  <CheckBox checked={on} />
                  <span className={styles.langName}>
                    <bdi dir={dirOf(code)}>{LANGUAGE_DEF[code].name}</bdi>
                  </span>
                  {gloss && <span className={styles.langMeta}>{gloss}</span>}
                </button>
              );
            })}
          </div>
        </section>

        <div className={styles.divider} />

        <section className={styles.group}>
          <h3 className={styles.groupTitle}>{t("lang_manage")}</h3>
          <p className={styles.groupHint}>{t("lang_manage_hint")}</p>
          <TranslationsCsv t={t} />
        </section>

        <div className={styles.divider} />

        <section className={styles.group}>
          <h3 className={styles.groupTitle}>{t("lang_edit_translation")}</h3>
          <p className={styles.groupHint}>
            {t("lang_edit_translation_hint")}
          </p>
          {additional.length === 0 ? (
            <p className={styles.empty}>{t("lang_edit_translation_empty")}</p>
          ) : (
            <div
              role="radiogroup"
              aria-label={t("lang_edit_translation")}
              className={styles.chips}
            >
              {surveyLangs.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  role="radio"
                  aria-checked={language.code === lang}
                  dir={dirOf(language.code)}
                  onClick={() => dispatch(changeLang(language.code))}
                  className={`${styles.chip} ${
                    language.code === lang ? styles.chipOn : ""
                  }`}
                >
                  <span className={styles.chipLabel} data-label={language.name}>
                    {language.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default React.memo(TranslationPanel);
