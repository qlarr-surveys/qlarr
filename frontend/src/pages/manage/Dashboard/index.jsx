import React, { lazy, Suspense, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Snackbar,
  Stack,
  TablePagination,
  Typography,
} from "@mui/material";
import styles from "./Dashboard.module.css";
import { HeaderContent } from "~/components/manage/HeaderContent";
import { isSurveyAdmin } from "~/constants/roles";
import { setLoading } from "~/state/edit/editState";
import { useDispatch } from "react-redux";

import CreateSurvey from "~/components/manage/CreateSurvey/CreateSurvey";
import { PROCESSED_ERRORS } from "~/utils/errorsProcessor";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

import { ImportSurvey } from "~/components/manage/ImportSurvey";
import LoadingDots from "~/components/common/LoadingDots";
import { useService } from "~/hooks/use-service";
import ConfirmActionModal from "~/components/common/ConfirmActionModal";
import StopSurveyModal from "~/components/manage/StopSurveyModal";
import { Add, Description, FileUpload } from "@mui/icons-material";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import DashboardEmptyState from "~/components/manage/DashboardEmptyState";
import {
  localDateToServerDateTime,
  serverDateTimeToLocalDateTime,
} from "~/utils/DateUtils";

const Survey = lazy(() => import("~/components/manage/Survey"));
const DASHBOARD_FILTERS_KEY = "dashboard_filters";

function Dashboard() {
  const surveyService = useService("survey");
  const [surveys, setSurveys] = useState(null);
  const [fetchingSurveys, setFetchingSurveys] = useState(true);

  const savedFilters = JSON.parse(
    sessionStorage.getItem(DASHBOARD_FILTERS_KEY) || "{}"
  );
  const [page, setPage] = useState(savedFilters.page || 1);
  const [perPage, setPerPage] = useState(savedFilters.perPage || 6);
  const [status, setStatus] = useState(savedFilters.status || "all");
  const [sortBy, setSortBy] = useState(
    savedFilters.sortBy || "last_modified_desc"
  );

  const [openImportModal, setOpenImportModal] = useState(false);
  const [recentlyUpdatedSurveyName, setRecentlyUpdatedSurveyName] =
    useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const dispatch = useDispatch();

  const { t } = useTranslation(NAMESPACES.MANAGE);

  const processApirror = (e) => {
    setFetchingSurveys(false);
  };

  const fetchSurveys = () => {
    setFetchingSurveys(true);
    surveyService
      .getAllSurveys(page, perPage, status, sortBy)
      .then((data) => {
        if (data) {
          setFetchingSurveys(false);
          setSurveys(data);
        }
      })
      .catch((e) => processApirror(e));
  };

  useEffect(() => {
    sessionStorage.setItem(
      DASHBOARD_FILTERS_KEY,
      JSON.stringify({ page, perPage, status, sortBy })
    );

    fetchSurveys();
  }, [page, perPage, sortBy, status]);

  const handleSurveyStatusChange = (id, newStatus) => {
    setSurveys((prevState) => ({
      ...prevState,
      surveys: prevState.surveys.map((survey) =>
        survey.id === id ? { ...survey, status: newStatus } : survey
      ),
    }));
  };

  const [description, setDescription] = useState("");
  const [actionType, setActionType] = useState("");
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(t("action_btn.delete"));
  const [openCreateModal, setOpenCreateModal] = useState(false);

  const handleCreateSurveyClick = () => {
    setOpenCreateModal(true);
  };

  const handleImportSurveyClick = () => {
    setOpenImportModal(true);
  };

  const onDelete = (survey) => {
    setActionType("delete");
    setTitle(t("action_btn.delete"));
    setSelectedSurvey(survey);
    setDescription(
      t("edit_survey.delete_survey", { survey_name: survey.name })
    );
    setOpen(true);
  };

  const onCloseSurvey = (survey) => {
    setActionType("close");
    setSelectedSurvey(survey);
    setOpen(true);
  };

  const handleAction = () => {
    if (actionType === "delete") {
      deleteSurvey(selectedSurvey.id);
      setOpen(false);
    }
  };

  const onClone = (survey) => {
    dispatch(setLoading(true));
    surveyService
      .cloneSurvey(survey.id)
      .then((result) => {
        if (result) {
          setRecentlyUpdatedSurveyName(result.name);
          fetchSurveys();
        }
      })
      .catch((processedError) => {})
      .finally(() => {
        dispatch(setLoading(false));
      });
  };

  const deleteSurvey = (id) => {
    dispatch(setLoading(true));
    surveyService
      .deleteSurvey(id)
      .then(() => {
        fetchSurveys();
      })
      .catch((e) => {
        dispatch(setLoading(false));
      })
      .finally(() => {
        dispatch(setLoading(false));
      });
  };

  const handleSurveyActionError = (processedError) => {
    if (processedError?.name === PROCESSED_ERRORS.INVALID_SURVEY_DATES.name) {
      setErrorMessage(t(`processed_errors.${processedError.name}`));
    }
  };

  const closeSurvey = (id) => {
    dispatch(setLoading(true));
    surveyService
      .closeSurvey(id)
      .then(() => {
        handleSurveyStatusChange(id, "closed");
      })
      .catch(handleSurveyActionError)
      .finally(() => {
        dispatch(setLoading(false));
      });
  };

  const expireSurvey = (survey) => {
    dispatch(setLoading(true));
    const pastCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newEndDate = localDateToServerDateTime(pastCutoff);
    const updatedSurvey = { ...survey, endDate: newEndDate };

    if (
      survey.startDate &&
      serverDateTimeToLocalDateTime(survey.startDate) >= pastCutoff
    ) {
      updatedSurvey.startDate = null;
    }

    surveyService
      .putSurvey(updatedSurvey, survey.id)
      .then(() => {
        setSurveys((prev) => ({
          ...prev,
          surveys: prev.surveys.map((s) =>
            s.id === survey.id ? updatedSurvey : s
          ),
        }));
      })
      .catch(handleSurveyActionError)
      .finally(() => {
        dispatch(setLoading(false));
      });
  };

  const handleUpdateSurveyName = (surveyId, newName) => {
    setSurveys((prevSurveys) => {
      const updatedSurveys = prevSurveys.surveys.map((survey) =>
        survey.id === surveyId ? { ...survey, name: newName } : survey
      );
      return {
        ...prevSurveys,
        surveys: updatedSurveys,
      };
    });
  };

  const handleUpdateSurveyDescription = (surveyId, newDescription) => {
    setSurveys((prevSurveys) => {
      const updatedSurveys = prevSurveys.surveys.map((survey) =>
        survey.id === surveyId
          ? { ...survey, description: newDescription }
          : survey
      );
      return {
        ...prevSurveys,
        surveys: updatedSurveys,
      };
    });
  };

  const handleUpdateSurveyImage = (surveyId, newImage) => {
    setSurveys((prevSurveys) => {
      const updatedSurveys = prevSurveys.surveys.map((survey) =>
        survey.id === surveyId ? { ...survey, image: newImage } : survey
      );
      return {
        ...prevSurveys,
        surveys: updatedSurveys,
      };
    });
  };

  return (
    <Box className={styles.mainContainer}>
      <Container sx={{ marginBottom: "48px" }}>
        <Box className={styles.content}>
          {(surveys?.surveys?.length > 0 || status !== "all") && (
          <Stack
            className={styles.newSurveysButton}
            direction="row"
            spacing={2}
          >
            {isSurveyAdmin() && (
              <CustomTooltip
                title={t("tooltips.create_new_survey")}
                showIcon={false}
              >
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Add />}
                  onClick={handleCreateSurveyClick}
                >
                  {t("create_new_survey")}
                </Button>
              </CustomTooltip>
            )}
            {isSurveyAdmin() && (
              <CustomTooltip
                title={t("tooltips.import_survey")}
                showIcon={false}
              >
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<FileUpload />}
                  onClick={handleImportSurveyClick}
                >
                  {t("import_survey")}
                </Button>
              </CustomTooltip>
            )}
          </Stack>
          )}

          {(surveys?.surveys?.length > 0 || status != "all") && (
            <HeaderContent
              filter={status}
              onFilterSelected={(el) => {
                setPage(1);
                setStatus(el.target.value);
              }}
              sort={sortBy}
              onSortSelected={(el) => {
                setPage(1);
                setSortBy(el.target.value);
              }}
            />
          )}

          <Box className={styles.surveyCardsContainer}>
            {!fetchingSurveys ? (
              <>
                {surveys?.surveys?.length > 0 ? (
                  <Box
                    sx={{
                      mt: 3,
                      columnGap: 2,
                      display: "grid",
                      rowGap: { xs: 4, md: 5 },
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(auto-fit, minmax(280px, 1fr))",
                        md: "repeat(auto-fit, minmax(330px, 350px))",
                      },
                    }}
                  >
                    {surveys?.surveys?.map((survey) => {
                      return (
                        <Suspense key={survey.id} fallback={<LoadingDots />}>
                          <Survey
                            key={survey.id}
                            survey={survey}
                            highlight={
                              survey.name === recentlyUpdatedSurveyName
                            }
                            onStatusChange={handleSurveyStatusChange}
                            onClone={() => onClone(survey)}
                            onDelete={() => onDelete(survey)}
                            onClose={() => onCloseSurvey(survey)}
                            onUpdateTitle={handleUpdateSurveyName}
                            onUpdateDescription={handleUpdateSurveyDescription}
                            onUpdateImage={handleUpdateSurveyImage}
                          />
                        </Suspense>
                      );
                    })}
                  </Box>
                ) : status !== "all" ? (
                  <div className={styles.noSurveys}>
                    <Description sx={{ fontSize: 48, color: "#ccc" }} />
                    <Typography
                      variant="h6"
                      color="textSecondary"
                      sx={{ mt: 2 }}
                    >
                      {t("create_survey.empty_state_message")}
                      <Button
                        variant="contained"
                        color="primary"
                        sx={{ mx: 1 }}
                        startIcon={<FilterAltOffIcon />}
                        onClick={() => {
                          setPage(1);
                          setStatus("all");
                        }}
                      >
                        {t("reset_filter")}
                      </Button>
                    </Typography>
                  </div>
                ) : (
                  <DashboardEmptyState
                    onCreateSurvey={handleCreateSurveyClick}
                    onImportTemplate={handleImportSurveyClick}
                    canCreate={isSurveyAdmin()}
                  />
                )}
              </>
            ) : (
              <LoadingDots fullHeight />
            )}
          </Box>

          {surveys?.totalCount > 6 ? (
            <TablePagination
              rowsPerPageOptions={[6, 12, 18, 24]}
              component="div"
              labelDisplayedRows={({ from, to, count, page }) => {
                return t("responses.label_displayed_rows", { from, to, count });
              }}
              labelRowsPerPage={t("responses.label_surveys_per_page")}
              count={surveys?.totalCount}
              rowsPerPage={perPage}
              page={page - 1}
              onPageChange={(event, newPage) => {
                setPage(newPage + 1);
              }}
              onRowsPerPageChange={(event) => {
                setPerPage(parseInt(event.target.value, 10));
                setPage(1);
              }}
            />
          ) : (
            <></>
          )}
        </Box>
      </Container>
      <ImportSurvey
        open={openImportModal}
        onResult={(success) => {
          setOpenImportModal(false);
          if (success) {
            fetchSurveys();
          }
        }}
      />
      <CreateSurvey
        open={openCreateModal}
        onResult={(success) => {
          setOpenCreateModal(false);
          if (success) {
            fetchSurveys();
          }
        }}
      />
      {actionType === "delete" && (
        <ConfirmActionModal
          open={open}
          description={description}
          onClose={() => setOpen(false)}
          onConfirm={handleAction}
          title={title}
          cancelLabel={t("action_btn.cancel")}
          confirmLabel={t("action_btn.delete")}
        />
      )}
      {actionType === "close" && (
        <StopSurveyModal
          open={open}
          canExpire={
            !selectedSurvey?.endDate ||
            serverDateTimeToLocalDateTime(selectedSurvey.endDate) >= Date.now()
          }
          onCancel={() => setOpen(false)}
          onClose={() => {
            closeSurvey(selectedSurvey.id);
            setOpen(false);
          }}
          onExpire={() => {
            expireSurvey(selectedSurvey);
            setOpen(false);
          }}
        />
      )}
      <Snackbar
        open={Boolean(errorMessage)}
        autoHideDuration={6000}
        onClose={() => setErrorMessage(null)}
      >
        <Alert onClose={() => setErrorMessage(null)} severity="error">
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Dashboard;
