import React from "react";
import {
  Modal,
  Box,
  Typography,
  Button,
  Stack,
  Divider,
} from "@mui/material";
import { Block, WarningAmber } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import styles from "./StopSurveyModal.module.css";

const StopSurveyModal = ({
  open,
  canExpire = true,
  onCancel,
  onClose,
  onExpire,
}) => {
  const { t } = useTranslation(NAMESPACES.MANAGE);

  const closeBullets = t("stop_survey.close_bullets", { returnObjects: true });
  const expireBullets = t("stop_survey.expire_bullets", { returnObjects: true });

  const handleClick = (handler) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    handler();
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      aria-labelledby="stop-survey-modal-title"
    >
      <Box className={styles.modalBox}>
        <Typography
          id="stop-survey-modal-title"
          variant="h4"
          fontWeight={600}
          component="h2"
          className={styles.title}
        >
          {t("stop_survey.title")}
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          sx={{mb:3}}
        >
          {t("stop_survey.description")}
        </Typography>

        <Stack
          direction={{ xs: "column", md: "row" }}
          divider={
            canExpire ? (
              <Divider
                orientation="vertical"
                flexItem
                className={styles.divider}
              />
            ) : null
          }
          className={styles.columns}
        >
          <Box className={styles.column}>
            <Typography variant="subtitle1" className={styles.columnTitle}>
              {t("stop_survey.close_column_title")}
            </Typography>
            {Array.isArray(closeBullets) && (
              <ul className={styles.bullets}>
                {closeBullets.map((bullet, idx) => (
                  <li key={idx}>{bullet}</li>
                ))}
              </ul>
            )}
            <Button
              variant="outlined"
              size="medium"
              startIcon={<Block />}
              onClick={handleClick(onClose)}
              className={styles.columnButton}
              sx={{
                borderColor: "error.dark",
                color: "error.dark",
                "&:hover": {
                  borderColor: "error.dark",
                  backgroundColor: "rgba(183, 29, 24, 0.04)",
                },
              }}
            >
              {t("stop_survey.close_button")}
            </Button>
          </Box>

          {canExpire && (
            <Box className={styles.column}>
              <Typography variant="subtitle1" className={styles.columnTitle}>
                {t("stop_survey.expire_column_title")}
              </Typography>
              {Array.isArray(expireBullets) && (
                <ul className={styles.bullets}>
                  {expireBullets.map((bullet, idx) => (
                    <li key={idx}>{bullet}</li>
                  ))}
                </ul>
              )}
              <Button
                variant="outlined"
                size="medium"
                startIcon={<WarningAmber />}
                onClick={handleClick(onExpire)}
                className={styles.columnButton}
              >
                {t("stop_survey.expire_button")}
              </Button>
            </Box>
          )}
        </Stack>

        <Box className={styles.footer}>
          <Button
            variant="text"
            size="medium"
            onClick={handleClick(onCancel)}
          >
            {t("stop_survey.cancel")}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default StopSurveyModal;
