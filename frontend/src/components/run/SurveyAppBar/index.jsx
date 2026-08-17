import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Toolbar,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ChangeLang from "../ChangeLang";
import { shallowEqual, useSelector, useStore } from "react-redux";
import styles from "./SurveyAppBar.module.css";
import { useTheme } from "@emotion/react";
import { LoadingButton } from "@mui/lab";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { getValues } from "~/state/runState";
import { useService } from "~/hooks/use-service";
import { routes } from "~/routes";
import { FRONT_END_HOST, PROTOCOL } from "~/constants/networking";
import { isAndroid } from "~/utils/common";

function SurveyAppBar({ toggleDrawer, preview }) {
  const lang = useSelector((state) => {
    return state.runState.data?.lang;
  }, shallowEqual);
  const { t } = useTranslation(NAMESPACES.RUN);

  const additionalLang = useSelector((state) => {
    return state.runState.data?.additionalLang;
  }, shallowEqual);

  const canSave = useSelector((state) => {
    return state.runState.data.navigationData.allowIncomplete;
  }, shallowEqual);

  const mode = useSelector((state) => {
    return state.runState.values.Survey.mode;
  });

  const theme = useTheme();

  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const store = useStore();
  const runService = useService("run");

  const handleSaveLater = async () => {
    setSaving(true);
    runService
      .navigate(
        {
          events: store.getState().runState.timings,
          values: getValues(store.getState().runState.values),
          responseId: sessionStorage.getItem("responseId"),
          navigationDirection: { name: "SAVE" },
        },
        preview
      )
      .then((response) => {
        routes.resumePreview;
        navigator.clipboard.writeText(
          `${PROTOCOL}://${FRONT_END_HOST}${(preview
            ? routes.resumePreview
            : routes.resumeSurvey
          )
            .replace(":responseId", sessionStorage.getItem("responseId"))
            .replace(":surveyId", sessionStorage.getItem("surveyId"))}`
        );
        setSnackbarOpen(true);
        setSaving(false);
        setSaveOpen(false);
      })
      .catch((e) => {
        setSaving(false);
        setSaveOpen(false);
      });
  };

  const handleSnackbarClose = (_, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  return (
    <>
      <Toolbar className={styles.toolbar}>
        <IconButton
          color="primary"
          size="large"
          edge="start"
          aria-label="menu"
          sx={{
            backgroundColor: theme.palette.background.paper,
          }}
          onClick={toggleDrawer(true)}
        >
          <MenuIcon />
        </IconButton>
        <Box display="flex" gap={2}>
          {!isAndroid && canSave && !(preview && mode == "offline") && (
            <Button
              variant="contained"
              size="small"
              onClick={() => setSaveOpen(true)}
              sx={{ minWidth: "fit-content", whiteSpace: "nowrap" }}
            >
              {t("save")}
            </Button>
          )}
          <ChangeLang lang={lang} additionalLang={additionalLang} />
        </Box>
      </Toolbar>

      <Dialog
        open={saveOpen}
        onClose={(_, reason) => {
          if (saving) return;
          setSaveOpen(false);
        }}
        disableEscapeKeyDown={saving}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("saveAndContinueLaterTitle")}</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ mb: 2 }}>
            {t("saveAndContinueLaterDesc")}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveOpen(false)} disabled={saving}>
            {t("cancel")}
          </Button>
          <LoadingButton
            onClick={handleSaveLater}
            variant="contained"
            loading={saving}
          >
            {t("saveForLater")}
          </LoadingButton>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          elevation={6}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {t("linkCopied")}
        </Alert>
      </Snackbar>
    </>
  );
}

export default SurveyAppBar;
