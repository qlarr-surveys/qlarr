import { Card, Snackbar, Alert } from "@mui/material";
import { Copy, Eye, Lock, Pencil, Table2, Trash2 } from "lucide-react";
import styles from "./Survey.module.css";
import { serverDateTimeToLocalDateTime } from "~/utils/DateUtils";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import SavingSurvey from "~/components/design/SavingSurvey";
import { fDate } from "~/utils/format-time";
import { isSurveyAdmin, isUserAnalyst } from "~/constants/roles";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { setLoading } from "~/state/edit/editState";
import { useService } from "~/hooks/use-service";
import { PROCESSED_ERRORS } from "~/utils/errorsProcessor";
import { useResourceUpload } from "~/hooks/useResourceUpload";
import { useNavigate } from "react-router-dom";
import { EditableSurveyTitle } from "./EditableSurveyTitle";
import { EditableSurveyDescription } from "./EditableSurveyDescription";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { setDesignModeToDesign } from "~/state/design/designState";
import { SurveyCover } from "./SurveyCover";

import { STATUS } from "./status";

const status = (survey) => {
  switch (survey.status) {
    case "draft":
      return STATUS.DRAFT;
    case "closed":
      return STATUS.CLOSED;
    case "active":
      if (
        survey.endDate &&
        serverDateTimeToLocalDateTime(survey.endDate) < Date.now()
      ) {
        return STATUS.EXPIRED;
      } else if (
        survey.startDate &&
        serverDateTimeToLocalDateTime(survey.startDate) > Date.now()
      ) {
        return STATUS.SCHEDULED;
      } else {
        return STATUS.ACTIVE;
      }
    default:
      return STATUS.DRAFT;
  }
};

// Lucide draws on the rendered pixel grid rather than MUI's 24px one, so the
// size is the icon's real size and the stroke is set with it: scale one
// without the other and the glyph thickens or thins against its neighbours.
// 17/1.5 and 16/1.5 are the redesign's own values for these two positions.
const ICON_ACTION = { size: 17, strokeWidth: 1.5 };
const ICON_INLINE = { size: 16, strokeWidth: 1.5 };

const ActionButton = ({ tooltip, onClick, variant, iconOnly, children }) => {
  const classNames = [
    styles.actionBtn,
    styles[`actionBtn${variant}`],
    iconOnly && styles.actionBtnIconOnly,
  ]
    .filter(Boolean)
    .join(" ");

  // An icon-only button has no text to name it, and the tooltip cannot stand in
  // for one: CustomTooltip hands MUI a node, so MUI only wires aria-describedby
  // while the tooltip is open. Without this the button is announced as "button".
  const button = (
    <button
      type="button"
      className={classNames}
      aria-label={iconOnly ? tooltip : undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );

  return tooltip ? (
    <CustomTooltip showIcon={false} title={tooltip}>
      {button}
    </CustomTooltip>
  ) : (
    button
  );
};

/**
 * The unpublished-changes marker: a pencil with a status dot, per the
 * redesign. The dot is what distinguishes "edited" from "edited and not yet
 * live", and it is decorative -- `label` carries that meaning for everyone.
 */
const UnpublishedBadge = ({ label, onEdit }) => {
  const content = (
    <>
      <Pencil {...ICON_INLINE} />
      <span aria-hidden="true" className={styles.unpublishedDot} />
    </>
  );

  return onEdit ? (
    <button
      type="button"
      className={styles.unpublishedBadge}
      aria-label={label}
      onClick={onEdit}
    >
      {content}
    </button>
  ) : (
    <span
      role="img"
      tabIndex={0}
      aria-label={label}
      className={`${styles.unpublishedBadge} ${styles.unpublishedBadgeStatic}`}
    >
      {content}
    </span>
  );
};

const Survey = ({
  survey,
  highlight,
  onClone,
  onDelete,
  onClose,
  onUpdateTitle,
  onUpdateDescription,
  onUpdateImage,
}) => {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const surveyStatus = status(survey);
  const surveyService = useService("survey");
  const uploadResource = useResourceUpload();

  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const isAdmin = isSurveyAdmin();

  // Every failed card action surfaces the same way. An error we don't recognise
  // still says something rather than nothing.
  const showError = (processedError) => {
    setError(
      t(
        `processed_errors.${
          processedError?.name ?? PROCESSED_ERRORS.UNIDENTIFIED_ERROR.name
        }`
      )
    );
    setOpenSnackbar(true);
  };

  const handleChangeTitle = (newTitle, revertTitle) => {
    dispatch(setLoading(true));
    surveyService
      .putSurvey({ ...survey, name: newTitle }, survey.id)
      .then(() => {
        onUpdateTitle(survey.id, newTitle);
      })
      // Revert on any failure, not just a duplicate name: the card used to keep
      // showing a title the server never stored.
      .catch((processedError) => {
        showError(processedError);
        revertTitle();
      })
      .finally(() => {
        dispatch(setLoading(false));
      });
  };

  const handleChangeDescription = (newDescription, revertDescription) => {
    dispatch(setLoading(true));
    surveyService
      .putSurvey({ ...survey, description: newDescription }, survey.id)
      .then(() => {
        onUpdateDescription(survey.id, newDescription);
      })
      // The revert callback the editor passes was dropped here, and the catch
      // was empty, so a failed save was silent and left unsaved text on screen.
      .catch((processedError) => {
        showError(processedError);
        revertDescription();
      })
      .finally(() => {
        dispatch(setLoading(false));
      });
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleImageUpload = (image) => {
    dispatch(setLoading(true));
    // The shared hook does the size pre-check and error processing. The
    // dashboard has no global error dialog, so it reports here instead.
    uploadResource(image, { surveyId: survey.id, onFailure: showError })
      .then((response) => {
        if (!response) return undefined;
        // Spread the survey: the edit endpoint assigns startDate/endDate
        // directly rather than merging, so a partial body clears both dates.
        return surveyService
          .putSurvey({ ...survey, image: response.name }, survey.id)
          .then(() => onUpdateImage(survey.id, response.name))
          .catch(showError);
      })
      .finally(() => {
        dispatch(setLoading(false));
      });
  };

  const openResponses = (e) => {
    e.stopPropagation();
    dispatch(setDesignModeToDesign());
    navigate(`/responses/${survey.id}`);
  };

  return (
    <>
      <SavingSurvey />
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity="error">
          {error}
        </Alert>
      </Snackbar>
      <Card
        className={`${styles.card} ${highlight ? styles.highlight : ""}`}
        sx={{
          // Sourced from the theme here so the stylesheet can use them inside
          // :hover and :focus-visible, where sx cannot reach.
          "--card-accent": (theme) => theme.palette.primary.main,
          "--card-danger": (theme) => theme.palette.error.dark,
        }}
      >
        <SurveyCover
          survey={survey}
          surveyStatus={surveyStatus}
          isEditable={isAdmin}
          onUpload={handleImageUpload}
        />

        <div className={styles.cardBody}>
          <EditableSurveyTitle
            survey={survey}
            onSave={handleChangeTitle}
            isEditable={isAdmin}
            badge={
              survey.status !== "closed" &&
              survey.latestVersion.published === false && (
                <CustomTooltip
                  title={t("label.unpublished_changes")}
                  showIcon={false}
                >
                  {/* A button for an admin, who can act on it, and a plain
                      focusable marker for everyone else, who can only read it.
                      Either way it takes focus, so the tooltip -- the only
                      place that says what the dot means -- is reachable
                      without a mouse. */}
                  <UnpublishedBadge
                    label={t("label.unpublished_changes")}
                    onEdit={
                      isAdmin
                        ? (e) => {
                            e.stopPropagation();
                            dispatch(setDesignModeToDesign());
                            navigate(`/edit-survey/${survey.id}`);
                          }
                        : undefined
                    }
                  />
                </CustomTooltip>
              )
            }
          />

          <EditableSurveyDescription
            survey={survey}
            onSave={handleChangeDescription}
            isEditable={isAdmin}
          />

          {/* usage has always been in the list payload and never shown. */}
          <p className={styles.cardMeta}>
            {t(`mode.${survey.usage}`)} &middot;{" "}
            {t("edit_survey.metadata.last_modified")}{" "}
            {fDate(survey.lastModified)}
          </p>

          <div className={styles.cardStats}>
            <button
              type="button"
              className={styles.responsesStat}
              onClick={openResponses}
            >
              <span className={styles.statValue}>
                {survey.completeResponseCount}
              </span>
              <span className={styles.statLabel}>
                {t("edit_survey.responses")}
              </span>
            </button>
            <div className={styles.createdStat}>
              <span className={styles.statLabel}>
                {t("edit_survey.metadata.created")}
              </span>
              <span className={styles.createdValue}>
                {fDate(survey.creationDate)}
              </span>
            </div>
          </div>

          <div className={styles.cardActions}>
            {isAdmin ? (
              <>
                {/* No icon: in the redesign the card's main action is the
                    only full-width button in the row, so the label alone
                    carries it and the icons stay the mark of the square
                    secondary buttons beside it. */}
                <ActionButton
                  variant="Primary"
                  onClick={(e) => {
                    dispatch(setDesignModeToDesign());
                    e.stopPropagation();
                    navigate(`/design-survey/${survey.id}`);
                  }}
                >
                  {t("edit_survey.title")}
                </ActionButton>

                {survey.status === "active" && (
                  <ActionButton
                    tooltip={t("edit_survey.close_title")}
                    variant="Secondary"
                    iconOnly
                    onClick={() => onClose(survey.id)}
                  >
                    <Lock {...ICON_ACTION} />
                  </ActionButton>
                )}

                <ActionButton
                  tooltip={t("edit_survey.clone_survey")}
                  variant="Secondary"
                  iconOnly
                  onClick={onClone}
                >
                  <Copy {...ICON_ACTION} />
                </ActionButton>

                {survey.status !== STATUS.ACTIVE && (
                  <ActionButton
                    tooltip={t("action_btn.delete")}
                    variant="Danger"
                    iconOnly
                    onClick={() => onDelete(survey.id)}
                  >
                    <Trash2 {...ICON_ACTION} />
                  </ActionButton>
                )}
              </>
            ) : (
              <>
                {isUserAnalyst() && (
                  <ActionButton variant="Primary" onClick={openResponses}>
                    <Table2 {...ICON_ACTION} />
                    {t("edit_survey.responses")}
                  </ActionButton>
                )}
                <ActionButton
                  variant="Primary"
                  onClick={(e) => {
                    dispatch(setDesignModeToDesign());
                    e.stopPropagation();
                    window.open(`/preview/${survey.id}`, "_blank");
                  }}
                >
                  <Eye {...ICON_ACTION} />
                  {t("preview")}
                </ActionButton>
              </>
            )}
          </div>
        </div>
      </Card>
    </>
  );
};

export default Survey;
