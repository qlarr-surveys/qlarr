import React from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { valueChange } from "~/state/runState";
import { useTheme } from "@emotion/react";
import { Box, Checkbox } from "@mui/material";
import { buildResourceUrl } from "~/networking/common";
import styles from "./ImageMcq.module.css";
import { setDirty } from "~/state/templateState";
import { rtlLanguage } from "~/utils/common";
import Content from '~/components/run/Content';

function ImageMcq(props) {
  const lang = useSelector((state) => {
    return state.runState.values["Survey"].lang;
  });

  const parentValue = useSelector((state) => {
    return state.runState.values[props.component.qualifiedCode].value || [];
  }, shallowEqual);
  const isRtl = rtlLanguage.includes(lang);

  const runValues = useSelector((s) => s.runState.values);

  return (
    <Box
      className={`${styles.imageFlexContainer} ${isRtl ? styles.rtl : ''}`}
      style={{ '--qlarr-spacing': `${props.component.spacing}px` }}
    >
      {props.component.answers.map((option) => {
        const relevance = runValues[option.qualifiedCode]?.relevance ?? true;
        if (!relevance) return null;

        return (
          <ImageMcqItem
            option={option}
            parentValue={parentValue}
            aspectRatio={props.component.imageAspectRatio}
            columns={props.component.columns || 3}
            spacing={props.component.spacing || 8}
            hideText={props.component.hideText}
            parentCode={props.component.qualifiedCode}
            key={option.qualifiedCode}
          />
        );
      })}
    </Box>
  );
}

function ImageMcqItem(props) {
  const theme = useTheme();

  const dispatch = useDispatch();
  const checked = props.parentValue.indexOf(props.option.code) > -1;

  const handleChange = () => {
    let parentValue = [...props.parentValue];
    if (checked) {
      parentValue = parentValue.filter((el) => el !== props.option.code);
    } else {
      parentValue.push(props.option.code);
    }
    dispatch(
      valueChange({
        componentCode: props.parentCode,
        value: parentValue,
      }),
    );
    dispatch(setDirty(props.option.qualifiedCode));
    dispatch(setDirty(props.parentCode));
  };
  const imageSrc = props.option.resources?.image
    ? buildResourceUrl(props.option.resources?.image)
    : '/placeholder-image.jpg';

  return (
    <Box
      key={props.option.code}
      data-code={props.option.code}
      className={styles.choiceItem}
      style={{ '--qlarr-item-flex': `0 1 calc(${100 / props.columns}% - ${props.spacing}px)` }}
    >
      <Box
        className={`${styles.imageContainer} ${checked ? styles.imageContainerSelected : ''}`}
        onClick={handleChange}
        style={{ paddingTop: 100 / props.aspectRatio + "%" }}
      >
        <img className={styles.image} src={imageSrc} alt="" />
        <div className={styles.selection}>
          <Checkbox
            onChange={handleChange}
            size="large"
            className={`${styles.radioCheck} ${styles.checkboxMargin}`}
            checked={checked}
          />
        </div>
      </Box>
      {!props.hideText && (
        <Content
          customStyle={`
                        text-align: center;
                        margin-top: 8px;
                      `}
          content={props.option.content?.label}
        />
      )}
    </Box>
  );
}

export default ImageMcq;
