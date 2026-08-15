import React from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import styles from "./IconMcq.module.css";
import { valueChange } from "~/state/runState";
import { useTheme } from "@emotion/react";
import { Box } from "@mui/material";
import DynamicSvg from "~/components/DynamicSvg";
import { buildResourceUrl } from "~/networking/common";
import Content from '~/components/run/Content';

function IconMcq(props) {
  const theme = useTheme();

  const parentValue = useSelector((state) => {
    return state.runState.values[props.component.qualifiedCode].value || [];
  }, shallowEqual);

  const hideText = props.component?.hideText || false;

  const runValues = useSelector((s) => s.runState.values);

  return (
    <Box
      className={styles.iconFlexContainer}
      style={{ '--qlarr-spacing': `${props.component.spacing || 8}px` }}
    >
      {props.component.answers.map((option) => {
        const relevance = runValues[option.qualifiedCode]?.relevance ?? true;
        if (!relevance) return null;

        console.log(option.code);
        return (
          <IconMcqChoice
            key={option.code}
            parentValue={parentValue}
            parentCode={props.component.qualifiedCode}
            component={option}
            columns={props.component.columns || 3}
            iconSize={props.component.iconSize || "150"}
            spacing={props.component.spacing || 8}
            theme={theme}
            hideText={hideText}
          />
        );
      })}
    </Box>
  );
}

function IconMcqChoice({
  component,
  parentValue,
  parentCode,
  iconSize,
  columns,
  spacing,
  hideText,
  theme,
}) {
  const dispatch = useDispatch();
  const checked = parentValue.indexOf(component.code) > -1;
  return (
    <Box
      data-code={component.code}
      key={component.code}
      className={styles.choiceItem}
      style={{ '--qlarr-item-flex': `0 1 calc(${100 / columns}% - ${spacing || 8}px)` }}
    >
      <div
        className={styles.iconCenter}
      >
        <DynamicSvg
          onIconClick={() => {
            let parentValue2 = [...parentValue];
            if (checked) {
              parentValue2 = parentValue2.filter((el) => el !== component.code);
            } else {
              parentValue2.push(component.code);
            }
            dispatch(
              valueChange({ componentCode: parentCode, value: parentValue2 })
            );
          }}
          imageHeight="100%"
          maxHeight={iconSize + "px"}
          svgUrl={
            component?.resources?.icon
              ? buildResourceUrl(component?.resources?.icon)
              : undefined
          }
          isSelected={checked}
          theme={theme}
        />
      </div>

      {!hideText && (
        <Content
          customStyle={`
                                text-align: center;
                                margin-top: 8px;
                                color: ${
                                  checked
                                    ? theme.palette.primary.main
                                    : theme.textStyles.text.color
                                },
                              `}
          content={component.content?.label}
        />
      )}
    </Box>
  );
}

export default IconMcq;
