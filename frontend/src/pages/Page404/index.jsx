import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button, Box } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

import styles from "./Page404.module.css";

function ErrorPage({ title, subtitle, showLogo = true }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const navigate = useNavigate();

  return (
    <div className={styles.pageWarper}>
      {showLogo && (
        <Box className={styles.logoContainer}>
          <img src="/qlarr.png" alt="Qlarr" className={styles.logo} />
        </Box>
      )}
      <div className={styles.pageTitle}>{title}</div>
      <div className={styles.pageSubTitle}>{subtitle}</div>
      <Button
        variant="contained"
        startIcon={<HomeIcon />}
        onClick={() => navigate("/")}
        className={styles.homeButton}
        sx={{
          mt: 3,
          backgroundColor: "#16205b",
          "&:hover": {
            backgroundColor: "#0d1439",
          },
        }}
      >
        {t("error.go_home")}
      </Button>
    </div>
  );
}

function Page404() {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  return (
    <ErrorPage
      title="404"
      subtitle={t("error.page_not_found")}
    />
  );
}

export function Unauthorized() {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  return (
    <ErrorPage
      title={t("error.unauthorized")}
      subtitle={t("error.unauthorized_message")}
    />
  );
}

export default Page404;
