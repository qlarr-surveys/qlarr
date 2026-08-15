import React from "react";
import styles from "./ChoiceDesign.module.css";
import { Button } from "@mui/material";
import ChoiceItemDesign from "~/components/Questions/Choice/ChoiceItemDesign";

import { useTheme } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import { inDesign } from "~/routes";
import {
  addNewAnswer,
  addNewAnswers,
  onNewLine,
} from "~/state/design/designState";

function ChoiceQuestion(props) {
  const theme = useTheme();
  const t = props.t;
  const dispatch = useDispatch();

  const children = useSelector((state) => {
    return state.designState[props.code].children;
  });

  const questionType = useSelector((state) => {
    return state.designState[props.code].type;
  });

  const canHaveOther =
    (questionType == "mcq" || questionType == "scq") &&
    (!children || !children.some((el) => el.type === "other"));

  const canHaveNone =
    (questionType == "mcq" || questionType == "scq") &&
    (!children || !children.some((el) => el.type === "none"));

  const canHaveAll =
    questionType == "mcq" &&
    (!children || !children.some((el) => el.type === "all"));

  return (
    <div className={styles.questionItem}>
      <div className={styles.choicesContainer}>
        {children &&
          children.length > 0 &&
          children.map((item, index) => (
            <ChoiceItemDesign
              designMode={props.designMode}
              code={item.code}
              t={props.t}
              onMoreLines={(data) => {
                dispatch(
                  addNewAnswers({
                    questionCode: props.code,
                    index,
                    data,
                  })
                );
              }}
              onNewLine={() => {
                dispatch(onNewLine({ questionCode: props.code, index }));
              }}
              label={item.code}
              key={item.code}
              qualifiedCode={item.qualifiedCode}
              index={index}
              langInfo={props.langInfo}
              type={props.type}
              droppableId={`option-${props.code}`}
            />
          ))}
      </div>
      {inDesign(props.designMode) && (
        <div className={styles.answerAdd}>
          <Button
            size="small"
            onClick={() => dispatch(addNewAnswer({ questionCode: props.code }))}
          >
            {t("add_option")}
          </Button>
          {canHaveOther && (
            <Button
              size="small"
              className={styles.answerIcon}
              onClick={() =>
                dispatch(
                  addNewAnswer({ questionCode: props.code, type: "other" })
                )
              }
            >
              {t("add_other")}
            </Button>
          )}
          {canHaveAll && (
            <Button
              size="small"
              className={styles.answerIcon}
              onClick={() =>
                dispatch(
                  addNewAnswer({ questionCode: props.code, type: "all" })
                )
              }
            >
              {t("add_all")}
            </Button>
          )}
          {canHaveNone && (
            <Button
              size="small"
              className={styles.answerIcon}
              onClick={() =>
                dispatch(
                  addNewAnswer({ questionCode: props.code, type: "none" })
                )
              }
            >
              {t("add_none")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(ChoiceQuestion);
