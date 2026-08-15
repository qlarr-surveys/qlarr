import React from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import TextField from "@mui/material/TextField";

import styles from "./EmailQuestion.module.css";
import { useTheme } from "@mui/material/styles";
import { valueChange } from "~/state/runState";
import { setDirty } from "~/state/templateState";

function EmailQuestion(props) {
  const theme = useTheme();
  const state = useSelector((state) => {
    let questionState = state.runState.values[props.component.qualifiedCode];
    let show_errors = state.runState.values.Survey.show_errors;
    let isDirty = state.templateState[props.component.qualifiedCode];
    let validity = questionState?.validity;
    let invalid = (show_errors || isDirty) && validity === false;
    return {
      value: questionState?.value || "",
      invalid: invalid,
    };
  }, shallowEqual);
  const dispatch = useDispatch();

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
        variant="outlined"
        size="small"
        required={
          props.component.validation?.validation_required?.isActive
            ? true
            : false
        }
        id={props.component.qualifiedCode}
        name={props.component.qualifiedCode}
        label={(props.component.showHint && props.component.content?.hint )|| ""}
        onChange={handleChange}
        onBlur={lostFocus}
        inputProps={{
          type: "email",
          maxLength: props.component.maxChars || undefined,
        }}
        value={state.value}
        error={state.invalid}
      />
    </div>
  );
}

export default EmailQuestion;
