import React, { memo } from "react";
import FormControlLabel from "@mui/material/FormControlLabel";
import { useDispatch, useSelector, shallowEqual } from "react-redux";

import Checkbox from "@mui/material/Checkbox";
import { alpha, useTheme } from "@mui/material/styles";
import { valueChange } from "~/state/runState";
import { setDirty } from "~/state/templateState";
import Content from "~/components/run/Content";

function McqAnswer(props) {
  const theme = useTheme();
  const dispatch = useDispatch();

  const disabled =
    (props.Answer.type !== "all" && props.allSelected) ||
    (props.Answer.type !== "none" && props.noneSelected);

  const relevance = useSelector((state) => {
    let answerState = state.runState.values[props.Answer?.qualifiedCode];
    return (
      typeof answerState?.relevance == "undefined" || answerState.relevance
    );
  }, shallowEqual);

  const handleChange = (event) => {
    let value = [...props.parentValue];
    if (event.target.checked && props.Answer.code === "Aall") {
      value = props.allCodes;
    } else if (!event.target.checked && props.Answer.code === "Aall") {
      value = [];
    } else if (event.target.checked && props.Answer.code === "Anone") {
      value = ["Anone"];
    } else if (event.target.checked) {
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
  };

  return relevance ? (
    <FormControlLabel
      data-code={props.Answer.code}s
      control={
        <Checkbox
          checked={
            props.parentValue.indexOf(props.Answer.code) > -1 ||
            (props.Answer.code === "Aall" && props.allSelected)
          }
          onChange={handleChange}
          disabled={disabled}
          name={props.Answer.qualifiedCode}
        />
      }
      label={
        <Content
          elementCode={props.Answer.code}
          customStyle={`
        opacity: ${disabled ? 0.5 : 1};
        font-size: ${theme.textStyles.text.size}px;
        `}
          name="label"
          content={props.Answer.content?.label}
        />
      }
    />
  ) : (
    ""
  );
}

export default memo(McqAnswer);
