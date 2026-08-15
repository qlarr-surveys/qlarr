import { HourglassEmpty } from "@mui/icons-material";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  createTheme,
} from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import Image from "~/components/image/image";
import CompactLayout from "~/layouts/compact";
import { useNavigate } from "react-router-dom";
import { palette } from "~/theme/palette";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

function ErrorLayout({ setErrorSeen, error }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const navigate = useNavigate();
  const theme = createTheme({
    palette: palette("light"),
  });
  if (error.name === "component_deleted") {
    return (
      <Dialog open={true}>
        <DialogTitle>{t("component_deleted_title")}</DialogTitle>
        <DialogContent>
          <Typography>{t("processed_errors.component_deleted")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setErrorSeen()}
            variant="contained"
            style={{
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
            }}
          >
            {t("ok")}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
  if (error.name == "survey_quota") {
    return (
      <CompactLayout>
        <div>
          <Typography variant="h3" paragraph>
            {t("error.survey_expired")}
          </Typography>
        </div>
        <div>
          <Typography sx={{ color: "text.secondary" }}>
            {t("processed_errors." + error.name)}
          </Typography>
        </div>
        <div>
          <HourglassEmpty
            sx={{
              mx: "auto",
              maxWidth: 320,
              my: { xs: 5, sm: 5 },
            }}
            style={{ fontSize: 50, color: "red" }}
          />
        </div>
        <Box display="flex" gap={2}>
          <Button
            fullWidth
            size="large"
            color="inherit"
            variant="contained"
            onClick={() => navigate(-1)}
          >
            {t("goBack")}
          </Button>
        </Box>
      </CompactLayout>
    );
  }

  return (
    <Dialog open={true} onClose={() => setErrorSeen()} maxWidth="sm" fullWidth>
      <DialogContent sx={{ textAlign: "center", py: 4 }}>
        <Typography variant="h3" paragraph>
           {t("error_title")}
        </Typography>
        <Typography sx={{ color: "text.secondary" }}>
          {t("processed_errors." + error.name)}
        </Typography>
        <Image
          alt="500"
          src="/illustration_500.svg"
          sx={{
            mx: "auto",
            maxWidth: 320,
            my: { xs: 5, sm: 8 },
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          fullWidth
          size="large"
          color="inherit"
          variant="contained"
          onClick={() => setErrorSeen()}
          style={{
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
          }}
        >
         {t("ok")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ErrorLayout;
