import React from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import styles from "./IconScq.module.css";
import { valueChange } from "~/state/runState";
import { useTheme } from "@emotion/react";
import { Box, Grid } from "@mui/material";
import DynamicSvg from "~/components/DynamicSvg";
import { buildResourceUrl } from "~/networking/common";
import Content from '~/components/run/Content';

function IconScq(props) {
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

  const hideText = props.component?.hideText || false;

  const runValues = useSelector((s) => s.runState.values);

  return (
    <Box
      className={styles.iconFlexContainer}
      style={{ '--qlarr-spacing': `${props.component.spacing || 8}px` }}
    >
      {props.component.answers.map((option) => {
        const isSelected = state.value == option.code;
        const relevance = runValues[option.qualifiedCode]?.relevance ?? true;
        if (!relevance) return null;
        return (
          <Box
            data-code={option.code}
            key={option.code}
            className={styles.choiceItem}
            style={{ '--qlarr-item-flex': `0 1 calc(${100 / props.component.columns}% - ${props.component.spacing || 8}px)` }}
          >
            <div
              className={styles.iconCenter}
            >
              <DynamicSvg
                onIconClick={() =>
                  handleChange(props.component.qualifiedCode, option.code)
                }
                imageHeight={"100%"}
                maxHeight={(props.component.iconSize || 150) + "px"}
                svgUrl={
                  option?.resources?.icon
                    ? buildResourceUrl(option?.resources?.icon)
                    : undefined
                }
                isSelected={isSelected}
                theme={theme}
              />
            </div>

            {!hideText && (
              <Content
                customStyle={`
                                text-align: center;
                                margin-top: 8px;
                                color: ${
                                  isSelected
                                    ? theme.palette.primary.main
                                    : theme.textStyles.text.color
                                },
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

export default IconScq;
