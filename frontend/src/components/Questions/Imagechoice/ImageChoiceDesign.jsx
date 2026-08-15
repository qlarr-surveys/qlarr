import React from "react";
import styles from "./ImageChoiceDesign.module.css";
import { useDispatch, useSelector } from "react-redux";

import { Box, Grid } from "@mui/material";
import ImageChoiceItemDesign from "./ImageChoiceItemDesign";
import IconChoiceItemDesign from "../Iconchoice/IconChoiceItemDesign";
import { inDesign } from "~/routes";
import { addNewAnswer } from "~/state/design/designState";

function ImageChoiceQuestion(props) {
  const dispatch = useDispatch();
  const state = useSelector((state) => {
    return state.designState[props.code];
  });

  const children = state.children || [];

  const imageAspectRatio = useSelector((state) => {
    return state.designState[props.code].imageAspectRatio || 1;
  });

  const questionType = state.type;

  const childrenWithAdd = inDesign(props.designMode)
    ? [...children, { type: "add", code: "add" }]
    : children;

  const columnNumber = state.columns || 2;
  const hideText = state.hideText || false;
  const spacing = state.spacing || 8;
  const imageHeight = state.iconSize ? +state.iconSize : 64;

  const itemWidth = `calc(${100 / columnNumber}% - ${spacing}px)`;

  return (
    <div className={styles.questionItem}>
      {imageHeight && (
        <Box
          id={"items-" + props.code}
          className={styles.flexContainer}
          style={{ "--qlarr-spacing": `${spacing}px` }}
        >
          {childrenWithAdd.map((item, index) =>
            props.icon ? (
              <Box
                key={item.code}
                className={styles.flexItem}
                style={{
                  "--qlarr-item-flex": `0 1 ${itemWidth}`,
                  "--qlarr-item-max-width": itemWidth,
                }}
              >
                <IconChoiceItemDesign
                  key={item.code}
                  code={item.code}
                  langInfo={props.langInfo}
                  parentCode={props.code}
                  index={index}
                  columnNumber={columnNumber}
                  designMode={props.designMode}
                  hideText={hideText}
                  imageHeight={imageHeight}
                  t={props.t}
                  addAnswer={() =>
                    dispatch(addNewAnswer({ questionCode: props.code }))
                  }
                  type={item.type}
                  qualifiedCode={item.qualifiedCode}
                />
              </Box>
            ) : (
              <Box
                key={item.code}
                className={styles.flexItem}
                style={{
                  "--qlarr-item-flex": `0 1 ${itemWidth}`,
                  "--qlarr-item-max-width": itemWidth,
                }}
              >
                <ImageChoiceItemDesign
                  key={item.code}
                  code={item.code}
                  langInfo={props.langInfo}
                  parentCode={props.code}
                  index={index}
                  imageAspectRatio={imageAspectRatio}
                  columnNumber={columnNumber}
                  hideText={hideText}
                  designMode={props.designMode}
                  imageHeight={imageHeight}
                  t={props.t}
                  addAnswer={() =>
                    dispatch(addNewAnswer({ questionCode: props.code }))
                  }
                  type={item.type}
                  qualifiedCode={item.qualifiedCode}
                />
              </Box>
            )
          )}
        </Box>
      )}
    </div>
  );
}

export default React.memo(ImageChoiceQuestion);
