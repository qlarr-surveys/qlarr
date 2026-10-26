import React from "react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import styles from "./TimeQuestionDesign.module.css";
import { useSelector } from "react-redux";
import { useEditableHint } from "~/hooks/useEditableHint";
import Iconify from "~/components/iconify";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

function TimeQuestionDesign({ code, designMode }) {
  const state = useSelector((state) => {
    return state.designState[code];
  });

  const lang = useSelector((state) => state.designState.langInfo?.lang);
  const { t } = useTranslation(NAMESPACES.RUN, { lng: lang });

  const { hintText, isEditable, handleHintChange } = useEditableHint(code, designMode);

  return (
    <div className={styles.questionItem}>
      <TextField
        variant="outlined"
        size="small"
        className={`${styles.designTextField} ${isEditable ? '' : styles.noPointerEvents}`}
        required={
          state.validation?.validation_required?.isActive ? true : false
        }
        value={isEditable ? hintText : ""}
        onChange={isEditable ? handleHintChange : undefined}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton edge="end">
                <Iconify icon="solar:clock-circle-outline" width={24} />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      {state.showNowButton && (
        <Button variant="outlined" className={`now-button ${styles.noPointerEvents}`}>
          {t("now")}
        </Button>
      )}
    </div>
  );
}

export default React.memo(TimeQuestionDesign);
