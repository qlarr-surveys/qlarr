import React from "react";
import { Box, Button, Link, Stack, Typography } from "@mui/material";
import { Add, UploadFileOutlined } from "@mui/icons-material";
import collectDataIcon from "~/assets/icons/collect-data.svg";
import trustResponseIcon from "~/assets/icons/trust-every-respons.svg";
import ownResultIcon from "~/assets/icons/own-every-result.svg";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import TokenService from "~/services/TokenService";
import styles from "./DashboardEmptyState.module.css";

function DashboardEmptyState({
  onCreateSurvey,
  onImportTemplate,
  canCreate,
  children,
}) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const user = TokenService.getUser();

  return (
    <Box>
      <Box className={styles.welcomeSection}>
        <Typography variant="h4" fontWeight={700}>
          {t("empty_state.welcome", {
            firstName: user?.firstName || "",
            lastName: user?.lastName || "",
          })}
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
          {t("empty_state.subtitle")}
        </Typography>
      </Box>

      <Box className={styles.container}>
        <Box className={styles.centerCard}>
        <img src="/empty-state.png" alt="" className={styles.illustration} />
        <Typography variant="h5" fontWeight={600} sx={{ mt: 3 }}>
          {t("empty_state.create_first_survey")}
        </Typography>

        {canCreate && (
          <>
            <Stack
              direction="row"
              spacing={2}
              justifyContent="center"
              sx={{ mt: 3 }}
            >
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={onCreateSurvey}
                sx={{
                  textTransform: "none",
                  px: 3,
                  py: 1.2,
                  borderRadius: "8px",
                }}
              >
                {t("empty_state.create_survey_btn")}
              </Button>
              {children}
            </Stack>
            <Link
              component="button"
              variant="body2"
              onClick={onImportTemplate}
              underline="hover"
              sx={{
                mt: 2,
                color: "primary.main",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <UploadFileOutlined sx={{ fontSize: 18 }} />
              {t("empty_state.import_template")}
            </Link>
          </>
        )}
      </Box>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={4}
        justifyContent="center"
        className={styles.featuresSection}
      >
        <Box className={styles.featureItem}>
          <img src={collectDataIcon} alt="" className={styles.featureIcon} />
          <Typography variant="body2" fontWeight={500}>
            {t("empty_state.feature_collect")}
          </Typography>
        </Box>
        <Box className={styles.featureItem}>
          <img src={trustResponseIcon} alt="" className={styles.featureIcon} />
          <Typography variant="body2" fontWeight={500}>
            {t("empty_state.feature_trust")}
          </Typography>
        </Box>
        <Box className={styles.featureItem}>
          <img src={ownResultIcon} alt="" className={styles.featureIcon} />
          <Typography variant="body2" fontWeight={500}>
            {t("empty_state.feature_own")}
          </Typography>
        </Box>
      </Stack>

      <Box className={styles.supportFooter}>
        <Typography variant="body2" color="textSecondary">
          {t("empty_state.need_help")}{" "}
          <Link
            href="mailto:support@qlarr.com"
            underline="hover"
            color="primary"
          >
            {t("empty_state.contact_support")}
          </Link>
        </Typography>
      </Box>
      </Box>

    </Box>
  );
}

export default DashboardEmptyState;
