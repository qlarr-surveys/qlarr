import React from "react";
import { IconButton, TextField, Typography } from "@mui/material";
import { EditOutlined, RestartAltOutlined } from "@mui/icons-material";
import styles from "./ValidationSetupMessage.module.css";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import {
  changeContent,
  changeValidationValue,
} from "~/state/design/designState";

function ValidationSetupMessage({ validationRule, code, rule, t }) {
  const dispatch = useDispatch();
  const { i18n } = useTranslation();

  const languagesList = useSelector((state) => {
    return state.designState.langInfo.languagesList;
  });

  // The standard message is shown for every survey language via
  // t(rule, { lng, ns: "run" }). With load: "currentOnly" the run bundle is
  // only fetched for the current design language, so other languages would
  // fall back to English. Ensure the run namespace is loaded for each survey
  // language, then force a re-render so the freshly fetched messages replace
  // the English fallback without waiting for an unrelated UI update.
  const [, forceRender] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const missing = languagesList
      .map((l) => l.code)
      .filter((lng) => !i18n.hasResourceBundle(lng, NAMESPACES.RUN));
    if (missing.length) {
      i18n.loadLanguages(missing).then(forceRender);
    }
  }, [i18n, languagesList]);

  const componentContent = useSelector((state) => {
    return state.designState[code]?.content;
  });

  const customFor = (lang) => componentContent?.[lang]?.[rule] || "";

  // A language is "editing" when it already has a saved custom message, or the
  // user explicitly clicked edit. Kept in local state so clearing the field
  // while typing doesn't collapse the input back to the standard message.
  const [editingLangs, setEditingLangs] = React.useState(
    () =>
      new Set(
        languagesList.filter((l) => customFor(l.code)).map((l) => l.code),
      ),
  );

  // Only the field the user just opened should grab focus (not pre-filled ones
  // rendered on mount).
  const [focusLang, setFocusLang] = React.useState(null);

  const startEditing = (lang) => {
    setEditingLangs((prev) => new Set(prev).add(lang));
    setFocusLang(lang);
    // Ensure the run side honours the custom message (legacy records may have
    // isCustomErrorActive explicitly set to false).
    if (validationRule.isCustomErrorActive === false) {
      dispatch(
        changeValidationValue({
          code,
          rule,
          key: "isCustomErrorActive",
          value: true,
        }),
      );
    }
  };

  const resetToStandard = (lang) => {
    setEditingLangs((prev) => {
      const next = new Set(prev);
      next.delete(lang);
      return next;
    });
    dispatch(changeContent({ code, key: rule, lang, value: "" }));
  };

  const onContentUpdate = (lang, value) => {
    dispatch(changeContent({ code, key: rule, lang, value }));
  };

  // Leaving the custom field empty falls back to the standard message.
  const onFieldBlur = (lang) => {
    if (!customFor(lang)) {
      setEditingLangs((prev) => {
        const next = new Set(prev);
        next.delete(lang);
        return next;
      });
    }
  };

  return (
    <div>
      <Typography fontWeight={700} className={styles.heading}>
        {t("error_message")}
      </Typography>
      {languagesList.map((l) => {
        const isEditing = editingLangs.has(l.code);
        return (
          <div className={styles.messageRow} key={l.code}>
            <div className={styles.rowLabel}>{l.code}:</div>
            <div className={styles.rowContent}>
              {isEditing ? (
                <TextField
                  fullWidth
                  size="small"
                  variant="standard"
                  placeholder={t(rule, {
                    ns: "run",
                    lng: l.code,
                    ...validationRule,
                  })}
                  autoFocus={focusLang === l.code}
                  value={customFor(l.code)}
                  onChange={(event) =>
                    onContentUpdate(l.code, event.target.value)
                  }
                  onBlur={() => onFieldBlur(l.code)}
                />
              ) : (
                <span className={styles.standardText}>
                  {t(rule, { ns: "run", lng: l.code, ...validationRule })}
                </span>
              )}
            </div>
            {isEditing ? (
              <IconButton
                size="small"
                aria-label={t("reset_to_standard_error")}
                title={t("reset_to_standard_error")}
                onClick={() => resetToStandard(l.code)}
              >
                <RestartAltOutlined fontSize="small" />
              </IconButton>
            ) : (
              <IconButton
                size="small"
                aria-label={t("edit_error_message")}
                title={t("edit_error_message")}
                onClick={() => startEditing(l.code)}
              >
                <EditOutlined fontSize="small" />
              </IconButton>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ValidationSetupMessage;
