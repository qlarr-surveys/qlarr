import { Drawer, IconButton } from "@mui/material";
import styles from "./SurveyDrawer.module.css";
import SurveyIndex from "~/components/run/SurveyIndex";
import React, { useMemo } from "react";
import { shallowEqual, useSelector } from "react-redux";
import { Close } from "@mui/icons-material";
import { useTheme } from "@emotion/react";
import { qlarrCssVars } from "~/components/Questions/qlarrVars";

const drawerSx = {
  "& .MuiDrawer-paper": {
    width: "350px",
    maxWidth: "90%",
    "@media (max-width: 600px)": {
      width: "300px",
    },
  },
};

function SurveyDrawer({ expanded, toggleDrawer, t, onPendingScrollTarget }) {
  const theme = useTheme();

  const navigationIndex = useSelector((state) => {
    return state.runState.data?.navigationIndex;
  }, shallowEqual);
  const survey = useSelector((state) => {
    return state.runState.data?.survey;
  }, shallowEqual);

  const cssVars = useMemo(
    () => qlarrCssVars(theme),
    [theme.palette],
  );

  return (
    <Drawer
      anchor="left"
      transitionDuration={expanded !== COLLAPSE_IMMEDIATE ? 500 : 0}
      open={expanded == EXPAND}
      onClose={toggleDrawer(false)}
      sx={drawerSx}
    >
      <div className={styles.drawer} style={cssVars}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerHeaderText}>
            <span className={styles.drawerTitle}>
              {t("survey_navigation")}
            </span>
          </div>
          <IconButton
            className={styles.closeButton}
            onClick={toggleDrawer(false)}
            size="small"
            aria-label="close"
          >
            <Close fontSize="small" />
          </IconButton>
        </div>
        <SurveyIndex
          navigationIndex={navigationIndex}
          survey={survey}
          t={t}
          onCloseDrawer={toggleDrawer(false)}
          onPendingScrollTarget={onPendingScrollTarget}
        />
      </div>
    </Drawer>
  );
}

export default React.memo(SurveyDrawer);

export const COLLAPSE_IMMEDIATE = "COLLAPSE_IMMEDIATE";
export const COLLAPSE = "COLLAPSE";
export const EXPAND = "EXPAND";
