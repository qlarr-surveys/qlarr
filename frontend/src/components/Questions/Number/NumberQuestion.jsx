import React from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import TextField from "@mui/material/TextField";
import styles from "./NumberQuestion.module.css";
import { valueChange } from "~/state/runState";
import { setDirty } from "~/state/templateState";

const SAFE_NUMBER_MAX_CHARS = 15;

function NumberQuestion(props) {
  const state = useSelector((state) => {
    let questionState = state.runState.values[props.component.qualifiedCode];
    let show_errors = state.runState.values.Survey.show_errors;
    let isDirty = state.templateState[props.component.qualifiedCode];
    let validity = questionState?.validity;
    let invalid = (show_errors || isDirty) && validity === false;
    return {
      value: questionState?.value,
      invalid: invalid,
    };
  }, shallowEqual);
  const dispatch = useDispatch();

  const cleanupValue = (oldValue, newValue) => {
    const regex =
      props.component.decimal_separator == "."
        ? /^[0-9]+\.?[0-9]*$/
        : props.component.decimal_separator == ","
          ? /^[0-9]+,?[0-9]*$/
          : /^[0-9]*$/;
    if (newValue == "") {
      return undefined;
    }
    if (regex.test(newValue)) {
      let withDecimal = convertToDecimal(newValue)
      let processed = +withDecimal;
      let returning = isNaN(processed) ? oldValue : processed;
      return returning;
    } else {
      return oldValue;
    }
  };

  const convertToDecimal = (value) => {
    if (props.component.decimal_separator != ",") {
      return value;
    }
    let stringValue = value.toString();
    return stringValue.replace(",", ".");
  };

  const formatValue = (value) => {
    if (value === undefined) return "";
    const str = value.toString();
    return props.component.decimal_separator == "," ? str.replace(".", ",") : str;
  };

  const handleChange = (event) => {
    dispatch(setDirty(event.target.name));
    dispatch(
      valueChange({
        componentCode: event.target.name,
        value: cleanupValue(state.value, event.target.value),
      })
    );
  };


  const maxLength = Math.min(
    props.component.maxChars || SAFE_NUMBER_MAX_CHARS,
    SAFE_NUMBER_MAX_CHARS
  );

  return (
    <div className={styles.questionItem}>
      <TextField
        variant="outlined"
        required={
          props.component.validation?.validation_required?.isActive
            ? true
            : false
        }
        size="small"
        id={props.component.qualifiedCode}
        name={props.component.qualifiedCode}
        label={(props.component.showHint && props.component.content?.hint )|| ""}
        onChange={handleChange}
        inputProps={{
          maxLength,
          inputMode: props.component.decimal_separator ? "decimal" : "numeric",
        }}
        value={formatValue(state.value)}
        error={state.invalid}
      />
    </div>
  );
}

export default NumberQuestion;
