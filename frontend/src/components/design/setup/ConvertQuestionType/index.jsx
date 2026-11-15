import React, { useId } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import {
  SetupField,
  SetupSelect,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";
import { useConvertQuestionType } from "./useConvertQuestionType";

export default function ConvertQuestionType({ code, t }) {
  const help = useSetupHelp();
  const id = useId();
  const {
    type,
    convertibleTypes,
    pendingType,
    lostAttributes,
    handleChange,
    handleConfirm,
    handleCancel,
  } = useConvertQuestionType(code);

  return (
    <SetupField
      label={t("question_type")}
      help={help("question_type")}
      htmlFor={id}
    >
      <SetupSelect
        id={id}
        value={type}
        onChange={(e) => handleChange(e.target.value)}
      >
        {convertibleTypes.map((qt) => (
          <option key={qt} value={qt}>
            {t(qt)}
          </option>
        ))}
      </SetupSelect>
      <Dialog open={!!pendingType} onClose={handleCancel}>
        <DialogTitle>{t("convert_warning_title")}</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>{t("convert_warning_body")}</Typography>
          <ul style={{ margin: 0, paddingInlineStart: 20 }}>
            {lostAttributes.map((attr) => (
              <li key={attr}>
                <Typography variant="body2">{t(attr)}</Typography>
              </li>
            ))}
          </ul>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>{t("cancel")}</Button>
          <Button onClick={handleConfirm} color="error" variant="contained">
            {t("convert_anyway")}
          </Button>
        </DialogActions>
      </Dialog>
    </SetupField>
  );
}
