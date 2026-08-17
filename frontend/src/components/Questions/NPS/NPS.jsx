import React from "react";

import { useTheme } from "@emotion/react";
import { shallowEqual, useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { Box } from "@mui/material";
import styles from "./NPS.module.css";

import { valueChange } from "~/state/runState";
import { setDirty } from "~/state/templateState";
import { getContrastColor } from "../utils";

function NPS(props) {
  const theme = useTheme();
  const dispatch = useDispatch();
  let columns = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const state = useSelector((state) => {
    return state.runState.values[props.component.qualifiedCode].value;
  }, shallowEqual);

  const handleChange = (option) => {
    dispatch(
      valueChange({
        componentCode: props.component.qualifiedCode,
        value: option,
      })
    );
    dispatch(setDirty(props.component.qualifiedCode));
  };

  const highlightContrast = getContrastColor(theme.palette.background.paper)
  return (
    <>
      <Box className={styles.choiceLabels}>
        <Box>{props.component.content?.lower_bound_hint || ""}</Box>
        <Box>{props.component.content?.higher_bound_hint || ""}</Box>
      </Box>
      <Box className={styles.choicesContainer}>
        {columns.map((option) => {
          const isSelected = state == option;
          return (
            <Box
              key={option}
              className={isSelected ? styles.choiceSelected : styles.choice}
              onClick={() => handleChange(option)}
              style={{ '--qlarr-highlight-contrast': highlightContrast }}
            >
              {option}
            </Box>
          );
        })}
      </Box>
    </>
  );
}

export default NPS;
