import React, { useId } from "react";
import { useDispatch, useSelector } from "react-redux";
import { changeAttribute, changeContent } from "~/state/design/designState";
import {
  SetupLabel,
  SetupLangInput,
  SetupToggle,
  setupFieldStyles,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";

function ShowHint({ code, t }) {
  const dispatch = useDispatch();
  const help = useSetupHelp();

  const showHint = useSelector((state) => {
    return state.designState[code].showHint || false;
  });

  const setCheckedHint = (value) => {
    dispatch(changeAttribute({ code, key: "showHint", value }));
  };

  return (
    <SetupToggle
      label={t("show_question_hint")}
      help={help("show_question_hint")}
      checked={showHint}
      onChange={setCheckedHint}
    />
  );
}

/** A translatable text setting: one input per survey language. */
export function SetupTextInput({ code, objectName, title, t }) {
  const dispatch = useDispatch();
  const help = useSetupHelp();
  const titleId = useId();
  const setContentValue = (lang, value) => {
    dispatch(changeContent({ code, key: objectName, lang, value }));
  };

  const languagesList = useSelector((state) => {
    return state.designState.langInfo.languagesList;
  });

  const content = useSelector((state) => {
    return state.designState[code].content;
  });

  const label = title ? t(title) : "";

  return (
    <div role="group" aria-labelledby={title ? titleId : undefined}>
      {title && (
        <div className={setupFieldStyles.head}>
          <SetupLabel
            label={label}
            help={objectName !== "hint" ? help(title) : ""}
            id={titleId}
            field
          />
        </div>
      )}
      <div className={setupFieldStyles.langList}>
        {languagesList.map((lang) => (
          <SetupLangInput
            key={lang.code}
            lang={lang}
            label={label}
            value={content?.[lang.code]?.[objectName] || ""}
            onChange={(value) => setContentValue(lang.code, value)}
          />
        ))}
      </div>
    </div>
  );
}

export default ShowHint;
