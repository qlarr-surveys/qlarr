import React, { useEffect, useState } from "react";
import {
  Modal,
  Box,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import styles from "./ConfirmActionModal.module.css";

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

  // Reset the checkbox every time the modal (re)opens — this instance is reused
  // across many destructive actions, so a prior acknowledgement must not carry over.
  useEffect(() => {
    if (open) setAcknowledged(false);
  }, [open]);

  const handleClose = (event, reason) => {
    if (isLoading) return;
    onClose?.(event, reason);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="confirm-action-modal"
      sx={{
        ".MuiBackdrop-root": {
          backgroundColor: "rgba(0, 0, 0, 0.3)",
        },
      }}
    >
      <Box className={styles.modalBox}>
        {requireAcknowledgement && (
          <Box
            sx={{
              mx: "auto",
              mb: 2,
              width: 56,
              height: 56,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "warning.lighter",
              color: "warning.dark",
            }}
          >
            <WarningAmberRoundedIcon sx={{ fontSize: 32 }} />
          </Box>
        )}

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.5,
          }}
        >
          <Typography
            id="confirm-action-modal"
            variant="h6"
            fontWeight={600}
            component="h2"
            textAlign="center"
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
            id="modal-description"
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, overflowWrap: "break-word" }}
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

        <Box display="flex" justifyContent="center" mt={3} gap={1}>
          <Button
            variant="text"
            size="medium"
            disabled={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClose?.();
            }}
            sx={{
              textTransform: "capitalize",
              color: "text.secondary",
              "&:hover": { backgroundColor: "action.hover" },
            }}
          >
            {cancelLabel}
          </Button>
          <LoadingButton
            variant="contained"
            color={confirmColor}
            size="medium"
            type="submit"
            loading={isLoading}
            disabled={isLoading || (requireAcknowledgement && !acknowledged)}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onConfirm?.();
            }}
            sx={{
              textTransform: "capitalize",
              backgroundColor: `${confirmColor}.dark`,
              color: "common.white",
              "&:hover": { backgroundColor: `${confirmColor}.darker` },
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
