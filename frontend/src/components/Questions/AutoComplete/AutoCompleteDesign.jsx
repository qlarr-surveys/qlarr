import React, { useState } from "react";

import { useSelector } from "react-redux";
import {
  Alert,
  Autocomplete,
  Button,
  ButtonBase,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import CloseIcon from "@mui/icons-material/Close";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { changeAttribute, changeResources } from "~/state/design/designState";
import styles from "./AutoComplete.module.css";
import LoadingDots from "~/components/common/LoadingDots";
import { useService } from "~/hooks/use-service";
import {
  formatlocalDateTime,
  serverDateTimeToLocalDateTime,
} from "~/utils/DateUtils";
import { processError, PROCESSED_ERRORS } from "~/utils/errorsProcessor";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

function AutoCompleteQuestion({ code, t, onMainLang }) {
  const designService = useService("design");
  const dispatch = useDispatch();
  const { t: tManage } = useTranslation(NAMESPACES.MANAGE);
  const [isUploading, setUploading] = useState(false);
  const [isFetchingValues, setIsFetchingValues] = useState(false);
  const [manualValues, setManualValues] = useState("");
  const [error, setError] = useState(null);
  const [dialogError, setDialogError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const state = useSelector((state) => {
    return state.designState[code];
  });
  const lang = useSelector((state) => {
    return state.designState.langInfo.lang;
  });

  const uploadFile = (file, onSuccess, useDialogError = false) => {
    if (!useDialogError) {
      setUploading(true);
      setError(null);
    } else {
      setDialogError(null);
    }
    designService
      .uploadAutoCompleteResource(file, code)
      .then((response) => {
        setUploading(false);
        dispatch(
          changeResources({ code, key: "autoComplete", value: response.name })
        );
        dispatch(
          changeAttribute({ code, key: "autoComplete", value: response })
        );
        onSuccess?.();
      })
      .catch((err) => {
        setUploading(false);
        const processed = processError(err) || PROCESSED_ERRORS.UNIDENTIFIED_ERROR;
        const errorMsg = tManage(`processed_errors.${processed.name}`);
        if (useDialogError) {
          setDialogError(errorMsg);
        } else {
          setError(errorMsg);
        }
      });
  };

  const handleUpload = (e) => {
    e.preventDefault();
    uploadFile(e.target.files[0]);
  };

  const handleManualEntryClick = () => {
    setDialogError(null);
    if (state.autoComplete) {
      setIsFetchingValues(true);
      designService
        .getAutoCompleteValues(code)
        .then((values) => {
          setManualValues(values.join("\n"));
          setDialogOpen(true);
        })
        .catch(() => {
          setManualValues("");
          setDialogOpen(true);
          setDialogError(tManage(`processed_errors.UNIDENTIFIED_ERROR`));
        })
        .finally(() => {
          setIsFetchingValues(false);
        });
    } else {
      setManualValues("");
      setDialogOpen(true);
    }
  };

  const handleManualSubmit = () => {
    const lines = manualValues
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) return;

    const blob = new Blob([JSON.stringify(lines)], { type: "application/json" });
    const file = new File([blob], "manual-entry.json", { type: "application/json" });
    uploadFile(file, () => {
      setManualValues("");
      setDialogOpen(false);
    }, true);
  };

  return (
    <>
      {!isUploading && state.autoComplete && (
        <>
          <p className={styles.largerText}>
            <strong>{t("data_uploaded")}</strong>
          </p>
          <p>
            <strong>{t("rows_count")}</strong> {state.autoComplete.rowCount}
          </p>
          <p>
            <strong>{t("last_modified")}</strong>
            {formatlocalDateTime(
              serverDateTimeToLocalDateTime(state.autoComplete.lastModified)
            )}
          </p>
        </>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Autocomplete
        id="readOnly"
        className={styles.autocompleteMarginTop}
        readOnly
        noOptionsText={t('logic_builder.no_options')}
        options={[]}
        renderInput={(params) => (
          <TextField
            {...params}
            className={styles.textFieldHalf}
            value=""
            label={state.showHint && (state.content?.[lang]?.hint || "")}
            variant="outlined"
          />
        )}
      />

      {isUploading ? (
        <div className={styles.buttonContainer}>
          <LoadingDots />
          <br />
          <span>{t("uploading_autocomplete")}</span>
        </div>
      ) : onMainLang ? (
        <div className={styles.buttonContainer}>
          <div className={styles.optionWrapper}>
            <ButtonBase
              component="label"
              onClick={(e) => e.stopPropagation()}
              className={styles.optionCard}
            >
              <UploadFileIcon className={styles.cardIcon} />
              <Typography className={styles.cardTitle}>
                {state.autoComplete ? t("replace_autocomplete") : t("upload_autocomplete")}
              </Typography>
              <input hidden accept="application/json,.json" type="file" onChange={handleUpload} />
            </ButtonBase>
            <Typography className={styles.cardHint}>
              {t("upload_autocomplete_hint")}
            </Typography>
          </div>
          <div className={styles.optionWrapper}>
            <ButtonBase
              onClick={handleManualEntryClick}
              disabled={isFetchingValues}
              className={styles.optionCard}
            >
              <ContentPasteIcon className={styles.cardIcon} />
              <Typography className={styles.cardTitle}>
                {isFetchingValues ? t("loading_values") : t("manual_entry")}
              </Typography>
            </ButtonBase>
            <Typography className={styles.cardHint}>
              {t("manual_entry_hint")}
            </Typography>
          </div>
        </div>
      ) : (
        <></>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {t("manual_entry")}
          <IconButton
            aria-label="close"
            onClick={() => setDialogOpen(false)}
            sx={{ color: (theme) => theme.palette.grey[500], mr: -1 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {dialogError && (
            <Alert severity="error" className={styles.alertMarginBottom} onClose={() => setDialogError(null)}>
              {dialogError}
            </Alert>
          )}
          <TextField
            multiline
            minRows={4}
            maxRows={12}
            fullWidth
            variant="outlined"
            placeholder={t("manual_entry_placeholder")}
            value={manualValues}
            onChange={(e) => setManualValues(e.target.value)}
            className={styles.textFieldMarginBottom}
          />
        </DialogContent>

        <DialogActions>
          <Button
            variant="outlined"
            onClick={handleManualSubmit}
            disabled={manualValues.trim().length === 0}
          >
            {t("submit_values")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default React.memo(AutoCompleteQuestion);
