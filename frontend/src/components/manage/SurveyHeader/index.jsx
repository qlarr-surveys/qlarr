import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Box, Button, IconButton, Typography } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import styles from "./SurveyHeader.module.css";
import { onEditErrorSeen } from "~/state/edit/editState";
import { isSessionRtl } from "~/utils/common";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { routes } from "~/routes";
import TokenService from "~/services/TokenService";
import { availablePages, isSurveyAdmin } from "~/constants/roles";
import VisibilityIcon from "@mui/icons-material/Visibility";
import HistoryIcon from "@mui/icons-material/History";

export const SurveyHeader = ({ showPreview }) => {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const dispatch = useDispatch();
  const nav = useNavigate();
  const isRtl = isSessionRtl();
  const { surveyId } = useParams();
  const surveyName = useSelector(
    (state) => state.editState?.survey?.name || ""
  );

  const user = TokenService.getUser();

  const availablePagesMemo = useMemo(() => {
    return availablePages(user);
  }, [user]);


  return (
    availablePagesMemo.length > 0 && (
      <Box data-tour="survey-header" className={styles.header}>
        <Box
          onClick={() => {
            dispatch(onEditErrorSeen());
            nav("/");
          }}
          className={isRtl ? styles.containerRtl : styles.container}
        >
          <CustomTooltip showIcon={false} title={t(`goBack`)}>
            <IconButton>
              <ArrowBack
                sx={{
                  fontSize: 30,
                  transform: isRtl ? "scaleX(-1)" : "none",
                  cursor: "pointer",
                  color: "black",
                }}
              />
            </IconButton>
          </CustomTooltip>
          <Typography variant="h3">{surveyName}</Typography>
        </Box>
        {showPreview && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mr: 2 }}>
            {isSurveyAdmin() && (
              <Button
                variant="outlined"
                color="primary"
                endIcon={<HistoryIcon />}
                onClick={() =>
                  nav(routes.designHistory.replace(":surveyId", surveyId))
                }
              >
                {t("edit_survey.version_history")}
              </Button>
            )}
            <Button
              data-tour="preview-button"
              variant="contained"
              color="primary"
              endIcon={<VisibilityIcon sx={{ color: "#fff" }} />}
              onClick={() => {
                window.open(
                  routes.preview.replace(":surveyId", surveyId),
                  "_blank"
                );
              }}
            >
              {t("preview")}
            </Button>
          </Box>
        )}
      </Box>
    )
  );
};
