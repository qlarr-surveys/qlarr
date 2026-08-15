import React from "react";

import styles from "./ParagraphQuestionDesign.module.css";
import { useSelector } from "react-redux";
import { TextField } from '@mui/material';
import { useEditableHint } from "~/hooks/useEditableHint";

function ParagraphQuestionDesign({ code, t, designMode }) {
  const state = useSelector((state) => {
    return state.designState[code];
  });

  const lang = useSelector((state) => {
    return state.designState.langInfo.lang;
  });

  const { hintText, isEditable, handleHintChange } = useEditableHint(code, designMode);

  return (
    <div className={styles.questionItem}>
      <TextField
        multiline
        className={`${styles.paragraph} ${styles.designTextField} ${isEditable ? '' : styles.noPointerEvents}`}
        required={
          state.validation?.validation_required?.isActive ? true : false
        }
        value={isEditable ? hintText : ""}
        onChange={isEditable ? handleHintChange : undefined}
        minRows={state.minRows || 4}
      />
      {state.showWordCount ? (
        <div className={styles.wordCount}>
          <span>{t("word_count", { lng: lang, count: 0 })}</span>
        </div>
      ) : (
        ""
      )}
    </div>
  );
}

export default React.memo(ParagraphQuestionDesign);
