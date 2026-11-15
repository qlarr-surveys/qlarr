import React, { useRef } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import SurveyQuota from "~/components/manage/SurveyQuota";
import GroupQuotas from "~/components/manage/GroupQuotas";
import ExportSurvey from "~/components/manage/ExportSurvey";
import NavigationSettings from "~/components/manage/NavigationSettings";
import { isSurveyAdmin } from "~/constants/roles";
import { SURVEY_STATUS } from "~/constants/survey";
import LaunchPage from "../Launch/launch";
import SurveyOffline from "../SurveyOffline";
import SurveyPrivacy from "../SurveyPrivacy";
import SettingsNav from "./SettingsNav";
import SettingsSection from "./SettingsSection";
import useSectionSpy from "./useSectionSpy";
import styles from "./EditSurvey.module.css";

const SECTION_IDS = [
  "launch",
  "offline",
  "privacy",
  "navigation",
  "quotas",
  "export",
];

/**
 * The Settings workspace, built to docs/design/editor-phase-3.3.html (where it
 * is called Configure): every survey-level setting on one scrolling canvas, a
 * card per section, with a nav on the left to jump between them.
 *
 * Settings save as they change, through the survey's debounced saver
 * (`editSaveDebounce`), so there is no save or done button.
 */
function EditSurvey({ onPublish }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const survey = useSelector((state) => state.editState.survey);
  const published = useSelector(
    (state) => state.designState.versionDto?.published
  );
  const designReady = useSelector(
    (state) =>
      !!state.designState.designStateReceived && !!state.designState.Survey
  );
  const groupQuotaCount = useSelector(
    (state) => state.designState.Survey?.quotas?.length || 0
  );

  const canvasRef = useRef(null);
  const { active, jumpTo, onScroll } = useSectionSpy(canvasRef, SECTION_IDS);

  if (!survey) {
    return null;
  }

  const quotasOff = !(survey.quota > 0) && groupQuotaCount === 0;

  const sections = [
    {
      id: "launch",
      title: t("edit_survey.launch"),
      hint: t("edit_survey.launch_hint"),
      // Something is waiting to be published: the same signal as the dot on
      // the Settings tab.
      badge: published === false ? "action" : null,
      content: <LaunchPage onPublish={onPublish} />,
    },
    {
      id: "offline",
      title: t("edit_survey.offline"),
      hint: t("edit_survey.offline_hint"),
      content: <SurveyOffline />,
    },
    {
      id: "privacy",
      title: t("edit_survey.privacy"),
      hint: t("edit_survey.privacy_hint"),
      content: <SurveyPrivacy />,
    },
    {
      id: "navigation",
      title: t("edit_survey.navigation"),
      hint: t("edit_survey.navigation_hint"),
      content: <NavigationSettings />,
    },
    {
      id: "quotas",
      title: t("edit_survey.quotas"),
      hint: t("edit_survey.quotas_hint"),
      badge: quotasOff ? "off" : null,
      content: (
        <>
          <SurveyQuota />
          {designReady && (
            <GroupQuotas
              disabled={
                !isSurveyAdmin() || survey.status == SURVEY_STATUS.CLOSED
              }
            />
          )}
        </>
      ),
    },
    {
      id: "export",
      title: t("edit_survey.export"),
      hint: t("edit_survey.export_hint"),
      content: <ExportSurvey />,
    },
  ];

  return (
    <div className={styles.workspace}>
      <SettingsNav
        t={t}
        sections={sections}
        active={active}
        onPick={jumpTo}
      />
      <div ref={canvasRef} onScroll={onScroll} className={styles.canvas}>
        <div className={styles.column}>
          {sections.map(({ id, title, hint, content }) => (
            <SettingsSection key={id} id={id} title={title} hint={hint}>
              {content}
            </SettingsSection>
          ))}
        </div>
      </div>
    </div>
  );
}

export default React.memo(EditSurvey);
