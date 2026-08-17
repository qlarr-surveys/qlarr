import {
  Card,
  Stack,
  Snackbar,
  Alert,
  Box,
  CardMedia,
  Badge,
} from "@mui/material";
import { Cancel } from "@mui/icons-material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ArticleIcon from "@mui/icons-material/Article";
import styles from "./Survey.module.css";
import { serverDateTimeToLocalDateTime } from "~/utils/DateUtils";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import SavingSurvey from "~/components/design/SavingSurvey";
import { fDate } from "~/utils/format-time";
import TableRowsIcon from "@mui/icons-material/TableRows";
import WarningIcon from "@mui/icons-material/Warning";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import { isSurveyAdmin, isUserAnalyst } from "~/constants/roles";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { setLoading } from "~/state/edit/editState";
import { useService } from "~/hooks/use-service";
import { PROCESSED_ERRORS } from "~/utils/errorsProcessor";
import { buildResourceUrl } from "~/networking/common";
import ImageIcon from "@mui/icons-material/Image";
import { useNavigate } from "react-router-dom";
import { EditableSurveyTitle } from "./EditableSurveyTitle";
import { EditableSurveyDescription } from "./EditableSurveyDescription";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import NumbersIcon from "@mui/icons-material/Numbers";
import { setDesignModeToDesign } from "~/state/design/designState";

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

const PAST_STATUSES = [STATUS.EXPIRED, STATUS.CLOSED];

const getDatesToShow = (survey, surveyStatus) => {
  const { creationDate, lastModified, startDate, endDate } = survey;

  if (startDate && endDate) {
    const anchor = PAST_STATUSES.includes(surveyStatus)
      ? {
          key: "created",
          labelKey: "edit_survey.metadata.created",
          value: creationDate,
        }
      : {
          key: "last_modified",
          labelKey: "edit_survey.metadata.last_modified",
          value: lastModified,
        };
    return [
      anchor,
      {
        key: "start_date",
        labelKey: "edit_survey.metadata.start_date",
        value: startDate,
      },
      {
        key: "end_date",
        labelKey: "edit_survey.metadata.end_date",
        value: endDate,
      },
    ].filter((d) => d.value);
  }

  const dates = [
    {
      key: "created",
      labelKey: "edit_survey.metadata.created",
      value: creationDate,
    },
    {
      key: "last_modified",
      labelKey: "edit_survey.metadata.last_modified",
      value: lastModified,
    },
  ];
  if (
    [STATUS.DRAFT, STATUS.CLOSED, STATUS.SCHEDULED].includes(surveyStatus) &&
    startDate
  ) {
    dates.push({
      key: "start_date",
      labelKey: "edit_survey.metadata.start_date",
      value: startDate,
    });
  }
  if ([STATUS.ACTIVE, STATUS.EXPIRED].includes(surveyStatus) && endDate) {
    dates.push({
      key: "end_date",
      labelKey: "edit_survey.metadata.end_date",
      value: endDate,
    });
  }
  return dates.filter((d) => d.value);
};

// Constants
const ICON_SIZE = { fontSize: 16 };
const ICON_SIZE_ACTION = { fontSize: 18 };
const BADGE_SX = {
  "& .MuiBadge-badge": { fontSize: 10, minWidth: 18, height: 18 },
};

// Helper Components
const DateItem = ({ label, value }) => (
  <div className={styles.dateItem}>
    <span className={styles.dateLabel}>{label}</span>
    <span className={styles.dateValue}>{value}</span>
  </div>
);

const ActionButton = ({ tooltip, onClick, variant, iconOnly, children }) => {
  const classNames = [
    styles.actionBtn,
    styles[`actionBtn${variant}`],
    iconOnly && styles.actionBtnIconOnly,
  ]
    .filter(Boolean)
    .join(" ");

  const button = (
    <button className={classNames} onClick={onClick}>
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
  const designService = useService("design");

  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Cache role checks
  const isAdmin = isSurveyAdmin();
  const isDefaultLogo = !survey.image;

  const handleChangeTitle = (newTitle, revertTitle) => {
    dispatch(setLoading(true));
    surveyService
      .putSurvey({ ...survey, name: newTitle }, survey.id)
      .then(() => {
        onUpdateTitle(survey.id, newTitle);
      })
      .catch((processedError) => {
        if (
          processedError.name == PROCESSED_ERRORS.DUPLICATE_SURVEY_NAME.name
        ) {
          setError(t(`processed_errors.${processedError.name}`));
          setOpenSnackbar(true);
          revertTitle();
        }
      })
      .finally(() => {
        dispatch(setLoading(false));
      });
  };

  const handleChangeDescription = (newDescription) => {
    dispatch(setLoading(true));
    surveyService
      .putSurvey({ ...survey, description: newDescription }, survey.id)
      .then(() => {
        onUpdateDescription(survey.id, newDescription);
      })
      .catch((processedError) => {})
      .finally(() => {
        dispatch(setLoading(false));
      });
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleImageUpload = (event) => {
    const image = event.target.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      designService
        .uploadResource(image, survey.id)
        .then((response) => {
          surveyService
            .putSurvey({ image: response.name }, survey.id)
            .then((result) => {
              onUpdateImage(survey.id, response.name);
            })
            .catch((err) => {
              setError(t(`processed_errors.${err.name}`));
              setOpenSnackbar(true);
            })
            .finally(() => {
              dispatch(setLoading(false));
            });
        })
        .catch((err) => {
          setError(t(`processed_errors.${err.name}`));
          setOpenSnackbar(true);
        })
        .finally(() => {
          dispatch(setLoading(false));
        });
    };

    reader.readAsDataURL(image);
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
        sx={{
          "&:hover": {
            boxShadow: (theme) => theme.customShadows.z24,
          },
        }}
        className={`${highlight ? styles.highlight : ""}`}
      >
        <Stack sx={{ pb: 0 }}>
          <Stack spacing={0.5} sx={{ mb: 1 }}>
            <Box className={styles.relativeContainer}>
              <Box className={styles.absoluteOverlay}>
                <EditableSurveyTitle
                  survey={survey}
                  onSave={handleChangeTitle}
                  isEditable={isAdmin}
                />
              </Box>

              <Box className={styles.logo}>
                <Box className={`${styles.logoImageWrapper}`}>
                  <CardMedia
                    component="img"
                    image={
                      survey.image
                        ? buildResourceUrl(survey.image, survey.id)
                        : "/placehoder-logo.png"
                    }
                    height="150"
                  />
                  <Box className={styles.imageOverlay} />

                  {isAdmin &&
                    (isDefaultLogo ? (
                      <Box
                        className={`${styles.photoIcon} ${styles.addLogoCta}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          document
                            .getElementById(`imageInput-${survey.id}`)
                            .click();
                        }}
                      >
                        <ImageIcon className={styles.addLogoIcon} />
                        <span className={styles.addLogoLabel}>
                          {t("edit_survey.add_logo")}
                        </span>
                      </Box>
                    ) : (
                      <Box
                        className={styles.photoIcon}
                        onClick={(e) => {
                          e.stopPropagation();
                          document
                            .getElementById(`imageInput-${survey.id}`)
                            .click();
                        }}
                      >
                        <ImageIcon className={styles.cameraIcon} />
                      </Box>
                    ))}
                </Box>
                <input
                  id={`imageInput-${survey.id}`}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageUpload}
                />
              </Box>
            </Box>

            <EditableSurveyDescription
              survey={survey}
              onSave={handleChangeDescription}
              isEditable={isAdmin}
            />

            <div className={styles.surveyMeta}>
              <CustomTooltip
                showIcon={false}
                body={t("users_manage.statuses_info")}
              >
                <div className={`${styles.statusPill} ${styles[surveyStatus]}`}>
                  <span className={styles.statusDot} />
                  {t(`status.${surveyStatus}`)}
                </div>
              </CustomTooltip>

              <div className={styles.surveyIconsContainer}>
                {survey.status !== "closed" &&
                  survey.latestVersion.published === false && (
                    <CustomTooltip
                      title={t("label.unpublished_changes")}
                      showIcon={false}
                    >
                      <div
                        className={styles.surveyIcon}
                        style={isAdmin ? undefined : { cursor: "default" }}
                        {...(isAdmin && {
                          onClick: (e) => {
                            e.stopPropagation();
                            dispatch(setDesignModeToDesign());
                            navigate(`/edit-survey/${survey.id}`);
                          },
                        })}
                      >
                        <WarningIcon sx={ICON_SIZE} />
                      </div>
                    </CustomTooltip>
                  )}

                <CustomTooltip
                  showIcon={false}
                  title={t("label.responses", {
                    count: survey.completeResponseCount,
                  })}
                >
                  <div
                    className={styles.surveyIcon}
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch(setDesignModeToDesign());
                      navigate(`/responses/${survey.id}`);
                    }}
                  >
                    <Badge
                      badgeContent={survey.completeResponseCount}
                      color="primary"
                      sx={BADGE_SX}
                    >
                      <TableRowsIcon sx={ICON_SIZE} />
                    </Badge>
                  </div>
                </CustomTooltip>
              </div>
            </div>
          </Stack>

          <div className={styles.surveyDates}>
            {getDatesToShow(survey, surveyStatus).map(
              ({ key, labelKey, value }) => (
                <DateItem key={key} label={t(labelKey)} value={fDate(value)} />
              ),
            )}
          </div>
        </Stack>

        <div className={styles.surveyActionsNew}>
          {isAdmin ? (
            <>
              <ActionButton
                variant="Primary"
                onClick={(e) => {
                  dispatch(setDesignModeToDesign());
                  e.stopPropagation();

                  navigate(`/design-survey/${survey.id}`);
                }}
              >
                <ArticleIcon sx={ICON_SIZE_ACTION} />
                {t("edit_survey.title")}
              </ActionButton>

              {survey.status === "active" && (
                <ActionButton
                  tooltip={t("edit_survey.close_title")}
                  variant="Secondary"
                  iconOnly
                  onClick={() => onClose(survey.id)}
                >
                  <Cancel sx={ICON_SIZE_ACTION} />
                </ActionButton>
              )}

              <ActionButton
                tooltip={t("edit_survey.clone_survey")}
                variant="Secondary"
                iconOnly
                onClick={onClone}
              >
                <FileCopyIcon sx={ICON_SIZE_ACTION} />
              </ActionButton>

              {survey.status !== STATUS.ACTIVE && (
                <ActionButton
                  tooltip={t("action_btn.delete")}
                  variant="Danger"
                  iconOnly
                  onClick={() => onDelete(survey.id)}
                >
                  <DeleteIcon sx={ICON_SIZE_ACTION} />
                </ActionButton>
              )}
            </>
          ) : (
            <>
              {isUserAnalyst() && (
                <ActionButton
                  variant="Primary"
                  onClick={(e) => {
                    dispatch(setDesignModeToDesign());
                    e.stopPropagation();
                     navigate(`/responses/${survey.id}`);
                  }}
                >
                  <TableRowsIcon sx={ICON_SIZE_ACTION} />

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
                <VisibilityIcon sx={ICON_SIZE_ACTION} />

                {t("preview")}
              </ActionButton>
            </>
          )}
        </div>
      </Card>
    </>
  );
};

export default Survey;
