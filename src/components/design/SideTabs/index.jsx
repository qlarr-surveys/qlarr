import { List, ListItem, ListItemButton, ListItemIcon } from "@mui/material";
import TableRowsIcon from "@mui/icons-material/TableRows";
import styles from "./SideTabs.module.css";
import React from "react";
import {
  Edit,
  LowPriority,
  Palette,
  Settings,
  Translate,
} from "@mui/icons-material";
import {
  DESIGN_SURVEY_MODE,
  MANAGE_SURVEY_LANDING_PAGES,
  routes,
} from "~/routes";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  setDesignModeToDesign,
  setDesignModeToLang,
  setDesignModeToTheme,
  setup,
} from "~/state/design/designState";
import { surveySetup } from "~/constants/design";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";

function SideTabs({ selectedPage, onPageChange, availablePages, surveyId }) {
  const tabAvailable = (tab) => availablePages.indexOf(tab) !== -1;
  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);
  const dispatch = useDispatch();
  const getTabButtonSx = (selected) => ({
    minWidth: "auto",
    padding: "0px",
    height: "70px",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: selected ? "#2d3cb2" : "transparent",
    color: "#fff",
    "&:hover": {
      backgroundColor: selected ? "#2d3cb2" : "rgba(255,255,255,0.1)",
    },
    "& .MuiTouchRipple-root": {
      color: "rgba(255,255,255,0.3)",
    },
  });

  const versionDto = useSelector((state) => {
    return state.designState.versionDto;
  });

  const published = versionDto?.published;

  const designMode = useSelector((state) => {
    return state.designState.designMode;
  });

  const orderPriorityActive = useSelector((state) => {
    const setupState = state.designState.setup;
    return (
      state.designState.designMode === DESIGN_SURVEY_MODE.DESIGN &&
      setupState?.code === "Survey" &&
      !!setupState?.rules?.some((rule) => rule.key === "random")
    );
  });

  function component() {
    return (
      <List data-tour="side-tabs">
        {tabAvailable(MANAGE_SURVEY_LANDING_PAGES.DESIGN) && (
          <>
            <SideTab
              tooltip={t("design")}
              buttonSx={getTabButtonSx(
                selectedPage == MANAGE_SURVEY_LANDING_PAGES.DESIGN &&
                  designMode == DESIGN_SURVEY_MODE.DESIGN &&
                  !orderPriorityActive
              )}
              link={routes.designSurvey.replace(":surveyId", surveyId)}
              icon={<Edit sx={{ color: "#fff" }} />}
              onClick={() => {
                onPageChange(MANAGE_SURVEY_LANDING_PAGES.DESIGN);
                dispatch(setDesignModeToDesign());
              }}
            />
            <SideTab
              dataTour="side-tab-theme"
              tooltip={t("theme")}
              buttonSx={getTabButtonSx(selectedPage == MANAGE_SURVEY_LANDING_PAGES.DESIGN && designMode == DESIGN_SURVEY_MODE.THEME)}
              icon={<Palette sx={{ color: "#fff" }} />}
              link={routes.designSurvey.replace(":surveyId", surveyId)}
              onClick={() => {
                onPageChange(MANAGE_SURVEY_LANDING_PAGES.DESIGN);
                dispatch(setDesignModeToTheme());
              }}
            />
            <SideTab
              dataTour="side-tab-translation"
              tooltip={t("translation")}
              link={routes.designSurvey.replace(":surveyId", surveyId)}
              buttonSx={getTabButtonSx(
                selectedPage == MANAGE_SURVEY_LANDING_PAGES.DESIGN && designMode == DESIGN_SURVEY_MODE.LANGUAGES
              )}
              icon={<Translate sx={{ color: "#fff" }} />}
              onClick={() => {
                onPageChange(MANAGE_SURVEY_LANDING_PAGES.DESIGN);
                dispatch(setDesignModeToLang());
              }}
            />
            <SideTab
              dataTour="side-tab-order-priority"
              tooltip={t("order_priority")}
              link={routes.designSurvey.replace(":surveyId", surveyId)}
              buttonSx={getTabButtonSx(orderPriorityActive)}
              icon={<LowPriority sx={{ color: "#fff" }} />}
              onClick={() => {
                onPageChange(MANAGE_SURVEY_LANDING_PAGES.DESIGN);
                dispatch(setDesignModeToDesign());
                dispatch(setup(surveySetup));
              }}
            />
          </>
        )}
        {tabAvailable(MANAGE_SURVEY_LANDING_PAGES.SETTINGS) && (
          <SideTab
            dataTour="side-tab-settings"
            tooltip={t("settings")}
            buttonSx={getTabButtonSx(
              selectedPage == MANAGE_SURVEY_LANDING_PAGES.SETTINGS
            )}
            link={routes.editSurvey.replace(":surveyId", surveyId)}
            icon={
              <div className={styles.launchContainer}>
                <Settings sx={{ color: "#fff" }} />
                {!published && (
                  <span className={styles.unpublishedChangesDot}></span>
                )}
              </div>
            }
            onClick={() => {
              onPageChange(MANAGE_SURVEY_LANDING_PAGES.SETTINGS);
            }}
          />
        )}
        {tabAvailable(MANAGE_SURVEY_LANDING_PAGES.RESPONSES) && (
          <SideTab
            dataTour="side-tab-responses"
            tooltip={t("responses")}
            buttonSx={getTabButtonSx(
              selectedPage == MANAGE_SURVEY_LANDING_PAGES.RESPONSES
            )}
            link={routes.responses.replace(":surveyId", surveyId)}
            icon={<TableRowsIcon sx={{ color: "#fff" }} />}
            onClick={() => {
              onPageChange(MANAGE_SURVEY_LANDING_PAGES.RESPONSES);
            }}
          />
        )}
      </List>
    );
  }

  return <div className={styles.surveyHeader}>{component()}</div>;
}

export default React.memo(SideTabs);

function SideTab({ tooltip, buttonSx, link, onClick, icon, isLink = true, dataTour }) {
  return (
    <CustomTooltip showIcon={false} title={tooltip} placement="right">
      {isLink ? (
        <Link to={link} onClick={() => onClick()}>
          <ListItem disablePadding data-tour={dataTour}>
            <ListItemButton sx={buttonSx}>
              <ListItemIcon sx={{ minWidth: "auto", justifyContent: "center", marginRight: 0 }}>{icon}</ListItemIcon>
            </ListItemButton>
          </ListItem>
        </Link>
      ) : (
        <ListItem disablePadding data-tour={dataTour}>
          <ListItemButton sx={buttonSx} onClick={() => onClick()}>
            <ListItemIcon sx={{ minWidth: "auto", justifyContent: "center", marginRight: 0 }}>{icon}</ListItemIcon>
          </ListItemButton>
        </ListItem>
      )}
    </CustomTooltip>
  );
}
