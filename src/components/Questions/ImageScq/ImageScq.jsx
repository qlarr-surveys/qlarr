import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import styles from "./ImageScq.module.css";
import { valueChange } from "~/state/runState";
import { useTheme } from "@emotion/react";
import { Box, Card, Grid, Radio } from "@mui/material";
import { buildResourceUrl } from "~/networking/common";
import { rtlLanguage } from "~/utils/common";
import Content from '~/components/run/Content';

function ImageScq(props) {
  const theme = useTheme();
  const state = useSelector((state) => {
    let questionState = state.runState.values[props.component.qualifiedCode];
    let show_errors = state.runState.values.Survey.show_errors;
    let isDirty = state.templateState[props.component.qualifiedCode];
    return {
      value: questionState?.value || "",
      showValidation:
        (show_errors || isDirty) && questionState?.validity === false,
    };
  }, shallowEqual);
  const dispatch = useDispatch();

  const handleChange = (componentCode, value) => {
    dispatch(valueChange({ componentCode, value }));
  };

  const lang = useSelector((state) => {
    return state.runState.values["Survey"].lang;
  });
  const isRtl = rtlLanguage.includes(lang);

  const runValues = useSelector((s) => s.runState.values);

  return (
    <Box
      className={`${styles.imageFlexContainer} ${isRtl ? styles.rtl : ''}`}
      style={{ '--qlarr-spacing': `${props.component.spacing}px` }}
    >
      {props.component.answers.map((option) => {
        const imageSrc = option.resources?.image
          ? buildResourceUrl(option.resources?.image)
          : '/placeholder-image.jpg';

        const relevance = runValues[option.qualifiedCode]?.relevance ?? true;
        if (!relevance) return null;
        return (
          <Box
            data-code={option.code}
            key={option.code}
            className={styles.choiceItem}
            style={{ '--qlarr-item-flex': `0 1 calc(${100 / props.component.columns}% - ${props.component.spacing}px)` }}
            onClick={() =>
              handleChange(props.component.qualifiedCode, option.code)
            }
          >
            <Box
              className={`${styles.imageContainer} ${state.value === option.code ? styles.imageContainerSelected : ''}`}
              style={{ paddingTop: `${100 / props.component.imageAspectRatio}%` }}
            >
              <img className={styles.image} src={imageSrc} alt="" />
              <div className={styles.selection}>
                <Radio
                  checked={state.value === option.code}
                  onChange={(event) =>
                    handleChange(event.target.name, event.target.value)
                  }
                  value={option.code}
                  className={`${styles.radioCheck} ${styles.radioMargin}`}
                  name={props.component.qualifiedCode}
                  size="large"
                />
              </div>
            </Box>
            {!props.component.hideText && (
              <Content
                customStyle={`
                  text-align: center;
                  margin-top: 8px;
                `}
                content={option.content?.label}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

export default ImageScq;
