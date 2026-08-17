import FormControl from "@mui/material/FormControl";
import FormGroup from "@mui/material/RadioGroup";

import React, { memo, useRef } from "react";
import FormControlLabel from "@mui/material/FormControlLabel";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import TextField from "@mui/material/TextField";

import Checkbox from "@mui/material/Checkbox";
import Validation from "~/components/run/Validation";
import { css, useTheme } from "@mui/material/styles";
import { valueChange } from "~/state/runState";
import { setDirty } from "~/state/templateState";
import MCQAnswer from "./MCQAnswer";

function MCQ(props) {
  const parentValue = useSelector((state) => {
    return state.runState.values[props.component.qualifiedCode].value || [];
  }, shallowEqual);
  const hasAll = props.component.answers.some((answer) => answer.type == "all");
  const allCodes = props.component.answers
    .filter(
      (answer) =>
        answer.type !== "all" &&
        answer.type !== "none" &&
        answer.type !== "other"
    )
    .map((answer) => answer.code);
  const allSelected =
    hasAll && allCodes.every((code) => parentValue.indexOf(code) > -1);
  const noneSelected = parentValue.indexOf("Anone") > -1;

  return (
    <FormControl component="fieldset">
      <FormGroup>
        {props.component.answers.map((option) => {
          if (option.type === "other") {
            return (
              <McqAnswerOther
                disabled={allSelected || noneSelected}
                key={option.qualifiedCode}
                allSelected={allSelected}
                noneSelected={noneSelected}
                Answer={option}
                parentCode={props.component.qualifiedCode}
              />
            );
          } else {
            return (
              <MCQAnswer
                parentValue={parentValue}
                key={option.qualifiedCode}
                Answer={option}
                allCodes={allCodes}
                parentCode={props.component.qualifiedCode}
                allSelected={allSelected}
                noneSelected={noneSelected}
              />
            );
          }
        })}
      </FormGroup>
    </FormControl>
  );
}

function McqAnswerOther(props) {
  const theme = useTheme();
  const nestedTextChild = props.Answer.answers[0];
  const parentValue = useSelector((state) => {
    return state.runState.values[props.parentCode].value || [];
  }, shallowEqual);
  const isSelected = parentValue.indexOf(props.Answer.code) > -1;
  const state = useSelector((state) => {
    let own = state.runState.values[props.Answer.qualifiedCode];
    let textChild = state.runState.values[nestedTextChild.qualifiedCode];
    let show_errors = state.runState.values.Survey.show_errors;
    let isChildDirty = state.templateState[nestedTextChild.qualifiedCode];
    return {
      showAnswer: typeof own?.relevance === "undefined" || own.relevance,
      childInvalid:
        (show_errors || isChildDirty) &&
        textChild?.relevance === true &&
        textChild?.validity === false,
      textValue: textChild?.value || "",
      textRelevance: state.textChild?.relevance,
    };
  }, shallowEqual);

  const dispatch = useDispatch();
  const onButtonClick = (event) => {
    let value = [...parentValue];
    if (event.target.checked) {
      value.push(props.Answer.code);
    } else {
      value = value.filter((el) => el !== props.Answer.code);
    }
    dispatch(
      valueChange({
        componentCode: props.parentCode,
        value: value,
      })
    );
    dispatch(setDirty(event.target.name));
    dispatch(setDirty(props.parentCode));
    if (event.target.checked) {
      textInput.current.focus();
    }
  };
  const handleChange = (event) => {
    dispatch(
      valueChange({
        componentCode: event.target.name,
        value: event.target.value,
      })
    );
  };

  const textInput = useRef();
  const handleFocus = (event) => {
    let value = [...parentValue];
    if (value.indexOf(props.Answer.code) == -1) {
      value.push(props.Answer.code);
      dispatch(valueChange({ componentCode: props.parentCode, value: value }));
    }
  };

  const lostFocus = (event) => {
    dispatch(setDirty(event.target.name));
  };

  const showAnswer = () => {
    return (
      <FormControlLabel
        css={css`
          .MuiTypography-root {
            width: 100%;
          }
        `}
        data-code={props.Answer.code}
        control={
          <Checkbox
            checked={isSelected}
            disabled={props.disabled}
            onChange={onButtonClick}
            name={props.Answer.qualifiedCode}
          />
        }
        label={
          <TextField
            variant="outlined"
            required={
              state.textRelevance && nestedTextChild.validation?.required
            }
            inputRef={textInput}
            id={nestedTextChild.qualifiedCode}
            name={nestedTextChild.qualifiedCode}
            disabled={props.disabled}
            label={props.Answer.content?.label}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={lostFocus}
            value={state.textValue}
            helperText={
              state.childInvalid ? (
                <Validation component={nestedTextChild} limit={1} />
              ) : (
                ""
              )
            }
          />
        }
      />
    );
  };

  return state.showAnswer ? showAnswer() : "";
}

export default memo(MCQ);
