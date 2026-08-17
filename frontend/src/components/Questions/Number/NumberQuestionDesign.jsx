import React from "react";
import TextField from "@mui/material/TextField";
import styles from "./NumberQuestionDesign.module.css";
import { useSelector } from "react-redux";
import { useEditableHint } from "~/hooks/useEditableHint";

function NumberQuestionDesign({ code, designMode }) {
  const state = useSelector((state) => {
    return state.designState[code];
  });

  const { hintText, isEditable, handleHintChange } = useEditableHint(code, designMode);

  return (
    <div className={styles.questionItem}>
      <TextField
        size="small"
        variant="outlined"
        className={`${styles.designTextField} ${isEditable ? '' : styles.noPointerEvents}`}
        required={
          state.validation?.validation_required?.isActive ? true : false
        }
        value={isEditable ? hintText : ""}
        onChange={isEditable ? handleHintChange : undefined}
      />
    </div>
  );
}

export default React.memo(NumberQuestionDesign);
