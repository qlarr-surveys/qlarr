import React from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import TextareaAutosize from "@mui/material/TextareaAutosize";

import styles from "./ParagraphQuestion.module.css";
import { valueChange } from "~/state/runState";
import { setDirty } from "~/state/templateState";
import { TextField } from "@mui/material";

function ParagraphQuestion(props) {
  const state = useSelector((state) => {
    let questionState = state.runState.values[props.component.qualifiedCode];
    let show_errors = state.runState.values.Survey.show_errors;
    let isDirty = state.templateState[props.component.qualifiedCode];
    let validity = questionState?.validity;
    let invalid = (show_errors || isDirty) && validity === false;
    let value = questionState?.value || "";
    return {
      value: value,
      wordCount: window.QlarrScripts
        ? window.QlarrScripts.wordCount(value)
        : 0,
      invalid: invalid,
    };
  }, shallowEqual);
  const dispatch = useDispatch();

  const { t } = useTranslation(NAMESPACES.RUN);

  const handleChange = (event) => {
    dispatch(
      valueChange({
        componentCode: event.target.name,
        value: event.target.value,
      })
    );
  };

  const lostFocus = (event) => {
    const trimmed = event.target.value.trim();
    if (event.target.value !== trimmed) {
      dispatch(
        valueChange({
          componentCode: event.target.name,
          value: trimmed,
        })
      );
    }
    dispatch(setDirty(event.target.name));
  };

  return (
    <div className={styles.questionItem}>
      <TextField
      size="small"
        className={styles.paragraph}
        required={
          props.component.validation?.validation_required?.isActive
            ? true
            : false
        }
        multiline
        id={props.component.qualifiedCode}
        name={props.component.qualifiedCode}
        minRows={props.component.minRows || 4}
        label={(props.component.showHint && props.component.content?.hint )|| ""}
        onChange={handleChange}
        onBlur={lostFocus}
        value={state.value}
      />
      {props.component.showWordCount ? (
        <div className={styles.wordCount}>
          <span>{t("word_count", { count: state.wordCount })}</span>
        </div>
      ) : (
        ""
      )}
    </div>
  );
}

export default ParagraphQuestion;
