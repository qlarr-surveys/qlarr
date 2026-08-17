import React from "react";
import Box from "@mui/material/Box";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import styles from "./EditSurvey.module.css";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import SurveyQuota from "~/components/manage/SurveyQuota";
import LaunchPage from "../Launch/launch";
import ExportSurvey from "~/components/manage/ExportSurvey";
import { useSelector } from "react-redux";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import NavigationSettings from "~/components/manage/NavigationSettings";
import SurveyOffline from '../SurveyOffline';
import SurveyPrivacy from '../SurveyPrivacy';

function EditSurvey({ onPublish }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const survey = useSelector((state) => state.editState.survey);

  const combinedSections = [
    {
      id: "offline",
      title: t("edit_survey.offline"),
      component: <SurveyOffline />,
    },
    {
      id: "privacy",
      title: t("edit_survey.privacy"),
      component: <SurveyPrivacy />,
    },
  ];

  const sections = [
    {
      id: "navigation",
      title: t("edit_survey.navigation"),
      component: <NavigationSettings/>,
    },
    {
      id: "quotas",
      title: t("edit_survey.quotas"),
      component: <SurveyQuota />
    },
    {
      id: "export",
      title: t("edit_survey.export"),
      component: <ExportSurvey />,
      tooltip: t("tooltips.export")
    },
  ];

  return survey && (
    <Box className={styles.mainContainer}>
      <Accordion className={styles.accordionContainer} defaultExpanded={true}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel-launch-content"
          id="panel-launch-header"
        >
          <Typography fontWeight="600" color="#1a2052" variant="h5">
            {t("edit_survey.launch")}
          </Typography>
        </AccordionSummary>
        <AccordionDetails
          id="panel-launch-content"
          className={styles.accordionDetails}
        >
          <LaunchPage onPublish={onPublish} />
        </AccordionDetails>
      </Accordion>
      <Box
        display="flex"
        flexWrap={{ xs: "wrap", sm: "wrap", md: "nowrap" }}
        alignItems="flex-start"
        gap={4}
        width="100%"
      >
        {combinedSections.map((section) => {
          return (
            <Accordion
              className={styles.accordionContainer}
              key={section.id}
              defaultExpanded={true}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`panel-${section.id}-content`}
                id={`panel-${section.id}-header`}
              >
                <Box display="flex" alignItems="center" gap=".5rem">
                  {section.tooltip && (
                    <CustomTooltip body={section.tooltip} />
                  )}
                  <Typography fontWeight="600" color="#1a2052" variant="h5">
                    {section.title}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails
                id={`panel-${section.id}-content`}
                className={styles.accordionDetails}
              >
                {section.component}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>

      {sections.map((section) => {
        return (
          <Accordion
            className={styles.accordionContainer}
            key={section.id}
            defaultExpanded={true}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`panel-${section.id}-content`}
              id={`panel-${section.id}-header`}
            >
              <Typography fontWeight="600" color="#1a2052" variant="h5">
                {section.title}
              </Typography>
            </AccordionSummary>
            <AccordionDetails
              id={`panel-${section.id}-content`}
              className={styles.accordionDetails}
            >
              {section.component}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}

export default React.memo(EditSurvey);
