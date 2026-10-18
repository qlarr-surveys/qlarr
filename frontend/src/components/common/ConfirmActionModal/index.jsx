import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  Box,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import { TriangleAlert } from "lucide-react";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import styles from "./ConfirmActionModal.module.css";

const TITLE_ID = "confirm-action-modal";
const DESCRIPTION_ID = "confirm-action-modal-description";

const ConfirmActionModal = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  cancelLabel,
  confirmLabel,
  confirmColor = "error",
  isLoading = false,
  requireAcknowledgement = false,
  acknowledgementLabel = "",
  acknowledgementTooltipTitle = "",
  acknowledgementTooltipBody = "",
}) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const cancelRef = useRef(null);

  // Reset the checkbox every time the modal (re)opens — this instance is reused
  // across many destructive actions, so a prior acknowledgement must not carry over.
  useEffect(() => {
    if (open) setAcknowledged(false);
  }, [open]);

  // Open on the way out, not on the way through with it. MUI would otherwise
  // focus the first thing it finds, which for the acknowledgement variant is
  // the checkbox that arms the destructive button.
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => cancelRef.current?.focus(), 40);
    return () => clearTimeout(id);
  }, [open]);

  const handleClose = (event, reason) => {
    if (isLoading) return;
    onClose?.(event, reason);
  };

  // The redesign's red is the dialog's own. Any other colour is a caller
  // asking for something non-destructive, which keeps the theme palette.
  const isDestructive = confirmColor === "error";
  const confirmClassName = [
    styles.button,
    styles.confirmButton,
    isDestructive && styles.destructiveButton,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby={TITLE_ID}
      aria-describedby={description ? DESCRIPTION_ID : undefined}
      sx={{
        ".MuiBackdrop-root": {
          backgroundColor: "rgba(20, 24, 52, 0.42)",
        },
      }}
    >
      {/* alertdialog, not dialog: everything that opens this interrupts to ask
          about something it is about to do. */}
      <Box className={styles.modalBox} role="alertdialog" aria-modal="true">
        {requireAcknowledgement && (
          <Box
            className={styles.warningIcon}
            sx={{
              backgroundColor: "warning.lighter",
              color: "warning.dark",
            }}
          >
            <TriangleAlert size={28} strokeWidth={1.5} />
          </Box>
        )}

        <Box className={styles.titleRow}>
          <Typography
            id={TITLE_ID}
            component="h2"
            className={styles.title}
          >
            {title}
          </Typography>
          {requireAcknowledgement && acknowledgementTooltipBody && (
            <CustomTooltip
              title={acknowledgementTooltipTitle}
              body={acknowledgementTooltipBody}
              showIcon
              placement="top"
            />
          )}
        </Box>

        {description && (
          <Typography
            id={DESCRIPTION_ID}
            component="p"
            className={styles.description}
          >
            {description}
          </Typography>
        )}

        {requireAcknowledgement && (
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              mt: 2.5,
              p: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 1,
              textAlign: "start",
              borderRadius: 2,
              backgroundColor: "warning.lighter",
              border: "1px solid",
              borderColor: "warning.light",
            }}
          >
            <FormControlLabel
              sx={{ m: 0, flex: 1, alignItems: "center" }}
              control={
                <Checkbox
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  size="small"
                  sx={{
                    p: 0.5,
                    ml: -0.5,
                    color: "warning.dark",
                    "&.Mui-checked": { color: "warning.dark" },
                  }}
                  inputProps={{ "aria-label": acknowledgementLabel }}
                />
              }
              label={
                <Typography
                  variant="body2"
                  sx={{ color: "warning.darker", fontWeight: 500, lineHeight: 1.4 }}
                >
                  {acknowledgementLabel}
                </Typography>
              }
            />
          </Box>
        )}

        <Box className={styles.actions}>
          <Button
            ref={cancelRef}
            variant="outlined"
            disabled={isLoading}
            className={`${styles.button} ${styles.cancelButton}`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClose?.();
            }}
          >
            {cancelLabel}
          </Button>
          <LoadingButton
            variant="contained"
            color={confirmColor}
            type="submit"
            loading={isLoading}
            disabled={isLoading || (requireAcknowledgement && !acknowledged)}
            className={confirmClassName}
            sx={
              isDestructive
                ? undefined
                : {
                    backgroundColor: `${confirmColor}.dark`,
                    "&:hover": { backgroundColor: `${confirmColor}.darker` },
                  }
            }
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onConfirm?.();
            }}
          >
            {confirmLabel}
          </LoadingButton>
        </Box>
      </Box>
    </Modal>
  );
};

export default ConfirmActionModal;
