import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, Eye, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import styles from "./SurveyHeader.module.css";
import { onEditErrorSeen } from "~/state/edit/editState";
import { isSessionRtl } from "~/utils/common";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { routes } from "~/routes";
import TokenService from "~/services/TokenService";
import { availablePages, isSurveyAdmin } from "~/constants/roles";

// Lucide draws on the rendered pixel grid rather than MUI's 24px one, so the
// size is the icon's real size and the stroke is set with it. These two are
// drawn at the phase-3.3 header's own values — 17 and 15 at lucide's full
// stroke — rather than the editor's lighter 1.33: they sit alone on a white
// band with no row of icons to match.
const ICON_STROKE = 2;

/**
 * The editor's top band: back to the survey list, the survey's name, whether
 * the work is saved, and the ways into version history and the preview.
 *
 * Rendered for every survey workspace, above the workspace tab strip.
 */
export const SurveyHeader = ({ showPreview, showSaveState }) => {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const dispatch = useDispatch();
  const nav = useNavigate();
  const isRtl = isSessionRtl();
  const { surveyId } = useParams();

  const user = TokenService.getUser();

  const name = useSelector((state) => state.editState.survey?.name);

  const availablePagesMemo = useMemo(() => {
    return availablePages(user);
  }, [user]);

  if (availablePagesMemo.length === 0) {
    return null;
  }

  return (
    <header data-tour="survey-header" className={styles.header}>
      <CustomTooltip showIcon={false} title={t("goBack")}>
        <button
          type="button"
          aria-label={t("goBack")}
          className={styles.backBtn}
          onClick={() => {
            dispatch(onEditErrorSeen());
            nav("/");
          }}
        >
          <ArrowLeft
            size={17}
            strokeWidth={ICON_STROKE}
            aria-hidden="true"
            className={isRtl ? styles.backIconRtl : undefined}
          />
        </button>
      </CustomTooltip>

      {/* Nothing until the survey arrives: an empty box where the name goes
          reads as a control that failed to draw. */}
      {name && <span className={styles.title}>{name}</span>}

      <div className={styles.spacer} />

      {showSaveState && <SaveState />}

      {showPreview && isSurveyAdmin() && (
        <CustomTooltip showIcon={false} title={t("edit_survey.version_history")}>
          <button
            type="button"
            aria-label={t("edit_survey.version_history")}
            className={styles.backBtn}
            onClick={() =>
              nav(routes.designHistory.replace(":surveyId", surveyId))
            }
          >
            <History size={17} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </button>
        </CustomTooltip>
      )}

      {showPreview && (
        <button
          type="button"
          data-tour="preview-button"
          className={styles.previewBtn}
          onClick={() => {
            window.open(routes.preview.replace(":surveyId", surveyId), "_blank");
          }}
        >
          <Eye size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
          {t("preview")}
        </button>
      )}
    </header>
  );
};

/**
 * Both workspaces that edit a survey save on a debounce with no Save button,
 * so the header is where that is said. `role="status"` because the text
 * changes under the reader rather than being navigated to.
 */
function SaveState() {
  const { t } = useTranslation(NAMESPACES.MANAGE);

  // Two stores, two debounced savers: the design editor's and the settings
  // form's. Either one in flight is the survey being saved.
  const isSaving = useSelector(
    (state) => state.designState.isSaving || state.editState.isSaving
  );

  return (
    <span role="status" className={styles.saveState}>
      {isSaving ? t("survey_header.saving") : t("survey_header.saved")}
    </span>
  );
}
