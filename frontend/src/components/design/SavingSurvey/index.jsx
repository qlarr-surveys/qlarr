import { Alert, Snackbar, CircularProgress } from "@mui/material";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import styles from "./SavingSurvey.module.css";

function SavingSurvey() {
  const { t } = useTranslation("design/core");
  const isSaving = useSelector((state) => {
    return state.designState.isSaving || state.editState.isSaving;
  });

  return (
    <Snackbar open={isSaving} className={styles.snackBar}>
      <Alert severity="warning">
        {t("saving_survey")}{" "}
        <CircularProgress className={styles.savingProgress} color="warning" />
      </Alert>
    </Snackbar>
  );
}

export default SavingSurvey;
