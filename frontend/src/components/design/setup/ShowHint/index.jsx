import React from "react";
import Switch from "@mui/material/Switch";
import styles from "./ShowHint.module.css";
import TextField from "@mui/material/TextField";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { changeAttribute, changeContent } from "~/state/design/designState";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

function ShowHint({ code, t }) {
  const dispatch = useDispatch();
  const { t: tTooltips } = useTranslation(NAMESPACES.DESIGN_TOOLTIPS);

  const showHint = useSelector((state) => {
    return state.designState[code].showHint || false;
  });

  const setCheckedHint = (value) => {
    dispatch(changeAttribute({ code, key: "showHint", value }));
  };

  return (
    <>
      <div className={styles.showHint}>
        <div className={styles.label}>
          <CustomTooltip body={tTooltips("show_question_hint")} />
          <Typography fontWeight={700}>{t("show_question_hint")}</Typography>
        </div>
        <Switch
          checked={showHint}
          onChange={(event) => setCheckedHint(event.target.checked)}
        />
      </div>
    </>
  );
}

export function SetupTextInput({ code, objectName, title, t }) {
  const dispatch = useDispatch();
  const { t: tTooltips } = useTranslation(NAMESPACES.DESIGN_TOOLTIPS);
  const setContentValue = (lang, value) => {
    dispatch(changeContent({ code, key: objectName, lang, value }));
  };

  const languagesList = useSelector((state) => {
    return state.designState.langInfo.languagesList;
  });

  const content = useSelector((state) => {
    return state.designState[code].content;
  });

  return (
    <>
      <div className={styles.label}>
        {objectName !== "hint" && (
          <CustomTooltip body={tTooltips(title)} />
        )}
        {title && <Typography fontWeight={700}>{t(`${title}`)}</Typography>}
      </div>
      {languagesList.map((lang) => {
        return (
          <div className={styles.inputValue} key={lang.code}>
            <TextField
              label={lang.name}
              variant="standard"
              type="text"
              value={content?.[lang.code]?.[objectName] || ""}
              onChange={(event) =>
                setContentValue(lang.code, event.target.value)
              }
            />
          </div>
        );
      })}
    </>
  );
}

export default ShowHint;
