import React, { lazy, Suspense, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Snackbar,
  TablePagination,
  Typography,
} from "@mui/material";
import styles from "./Dashboard.module.css";
import { HeaderContent } from "~/components/manage/HeaderContent";
import { setLoading } from "~/state/edit/editState";
import { useDispatch } from "react-redux";

import CreateSurvey from "~/components/manage/CreateSurvey/CreateSurvey";
import { PROCESSED_ERRORS } from "~/utils/errorsProcessor";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

import { ImportSurvey } from "~/components/manage/ImportSurvey";
import LoadingDots from "~/components/common/LoadingDots";
import { useService } from "~/hooks/use-service";
import ConfirmActionModal from "~/components/common/ConfirmActionModal";
import StopSurveyModal from "~/components/manage/StopSurveyModal";
import { ErrorOutline } from "@mui/icons-material";
import DashboardEmptyState from "~/components/manage/DashboardEmptyState";
import ActionCards from "~/components/manage/Dashboard/ActionCards";
import { useDashboardActions } from "~/components/manage/Dashboard/useDashboardActions";
import {
  localDateToServerDateTime,
  serverDateTimeToLocalDateTime,
} from "~/utils/DateUtils";

const Survey = lazy(() => import("~/components/manage/Survey"));
const DASHBOARD_FILTERS_KEY = "dashboard_filters";
const ROWS_PER_PAGE_OPTIONS = [6, 12, 18, 24];
// The pager only earns its space once the smallest page size would split the
// list. Below that every option shows everything, so there is nothing to pick.
// It must not key off the current perPage: the rows-per-page selector lives
// inside the pager, so hiding it at perPage 24 strands you on 24.
const MIN_ROWS_PER_PAGE = Math.min(...ROWS_PER_PAGE_OPTIONS);

function Dashboard() {
  const surveyService = useService("survey");
  const [surveys, setSurveys] = useState(null);
  const [fetchingSurveys, setFetchingSurveys] = useState(true);

  const savedFilters = JSON.parse(
    sessionStorage.getItem(DASHBOARD_FILTERS_KEY) || "{}"
  );
  const [page, setPage] = useState(savedFilters.page || 1);
  const [perPage, setPerPage] = useState(savedFilters.perPage || MIN_ROWS_PER_PAGE);
  const [status, setStatus] = useState(savedFilters.status || "all");
  const [sortBy, setSortBy] = useState(
    savedFilters.sortBy || "last_modified_desc"
  );

  const [openImportModal, setOpenImportModal] = useState(false);
  const [recentlyUpdatedSurveyName, setRecentlyUpdatedSurveyName] =
    useState(null);
  // One transient message bar for the whole page: survey actions report both
  // what succeeded and what failed, and only one of them is ever on screen.
  const [notice, setNotice] = useState(null);
  const [fetchError, setFetchError] = useState(false);

  const dispatch = useDispatch();

  const { t } = useTranslation(NAMESPACES.MANAGE);

  const showNotice = (message, severity = "error") =>
    setNotice({ message, severity });

  const showActionError = (processedError) =>
    showNotice(
      t(
        `processed_errors.${
          processedError?.name ?? PROCESSED_ERRORS.UNIDENTIFIED_ERROR.name
        }`
      )
    );

  const processApirror = (e) => {
    setFetchingSurveys(false);
    setFetchError(true);
  };

  const fetchSurveys = () => {
    setFetchingSurveys(true);
    setFetchError(false);
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

  // .highlight animates for 3s and then keeps its background colour, so drop
  // the marker once the animation is done.
  useEffect(() => {
    if (!recentlyUpdatedSurveyName) return undefined;
    const timer = setTimeout(() => setRecentlyUpdatedSurveyName(null), 3000);
    return () => clearTimeout(timer);
  }, [recentlyUpdatedSurveyName]);

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
  const [title, setTitle] = useState("");
  const [openCreateModal, setOpenCreateModal] = useState(false);

  const handleCreateSurveyClick = () => {
    setOpenCreateModal(true);
  };

  const handleImportSurveyClick = () => {
    setOpenImportModal(true);
  };

  const actions = useDashboardActions({
    onCreateSurvey: handleCreateSurveyClick,
    onImportSurvey: handleImportSurveyClick,
  });

  // The first-run empty state is the whole page: it carries its own welcome
  // heading and both actions, so the page heading and the action cards above
  // it would only say the same things twice. Until the first response lands
  // we don't know which way it goes, so they wait with the list rather than
  // flashing above an empty state that then replaces them.
  const showPageIntro =
    fetchError || status !== "all" || Boolean(surveys?.surveys?.length);

  const onDelete = (survey) => {
    setActionType("delete");
    // The question names the survey and the body says what goes with it, as
    // the redesign writes its confirmations. The title used to be the word
    // "Delete" on its own, which asked nothing.
    setTitle(t("edit_survey.delete_survey_title", { survey_name: survey.name }));
    setSelectedSurvey(survey);
    setDescription(t("edit_survey.delete_survey"));
    setOpen(true);
  };

  const onCloseSurvey = (survey) => {
    setActionType("close");
    setSelectedSurvey(survey);
    setOpen(true);
  };

  const handleAction = () => {
    if (actionType === "delete") {
      deleteSurvey(selectedSurvey);
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
      .catch(showActionError)
      .finally(() => {
        dispatch(setLoading(false));
      });
  };

  const deleteSurvey = (survey) => {
    dispatch(setLoading(true));
    surveyService
      .deleteSurvey(survey.id)
      .then(() => {
        // Informational only. The delete has already cascaded through the
        // design, the responses and the uploaded files, and there is no
        // restore endpoint, so there is nothing to offer an undo for.
        showNotice(
          t("edit_survey.survey_deleted", { survey_name: survey.name }),
          "info"
        );
        fetchSurveys();
      })
      .catch(showActionError)
      .finally(() => {
        dispatch(setLoading(false));
      });
  };

  const handleSurveyActionError = (processedError) => {
    if (processedError?.name === PROCESSED_ERRORS.INVALID_SURVEY_DATES.name) {
      showActionError(processedError);
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
    <Box
      className={styles.mainContainer}
      sx={{
        "--card-accent": (theme) => theme.palette.primary.main,
      }}
    >
      <Container sx={{ marginBottom: "48px" }}>
        <Box className={styles.content}>
          {showPageIntro && (
            <>
              <Box className={styles.pageHeading}>
                <h1 className={styles.heading}>{t("my_surveys")}</h1>
                <p className={styles.subtitle}>{t("dashboard.subtitle")}</p>
              </Box>

              <ActionCards actions={actions} />
            </>
          )}

          {(surveys?.surveys?.length > 0 || status != "all") && (
            <Box className={styles.listHeading}>
              <HeaderContent
                heading={
                  <h2 className={styles.sectionHeading}>
                    {t("recent_surveys")}{" "}
                    <span className={styles.sectionCount}>
                      &middot;{" "}
                      {t("survey_count", { count: surveys?.totalCount ?? 0 })}
                    </span>
                  </h2>
                }
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
            </Box>
          )}

          <Box className={styles.surveyCardsContainer}>
            {!fetchingSurveys ? (
              <>
                {fetchError ? (
                  <div className={styles.noSurveys}>
                    <ErrorOutline sx={{ fontSize: 48, color: "error.dark" }} />
                    <Typography
                      variant="h6"
                      color="textSecondary"
                      sx={{ mt: 2 }}
                    >
                      {t("fetch_error")}
                      <Button
                        variant="contained"
                        color="primary"
                        sx={{ mx: 1 }}
                        onClick={fetchSurveys}
                      >
                        {t("action_btn.retry")}
                      </Button>
                    </Typography>
                  </div>
                ) : surveys?.surveys?.length > 0 ? (
                  <Box className={styles.surveyGrid}>
                    {surveys?.surveys?.map((survey) => {
                      return (
                        <Suspense key={survey.id} fallback={<LoadingDots />}>
                          <Survey
                            key={survey.id}
                            survey={survey}
                            highlight={
                              survey.name === recentlyUpdatedSurveyName
                            }
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
                  /* Nothing is missing here -- a filter is simply hiding it.
                     A dashed panel says "this space is empty by your choice",
                     where the grey icon and the filled button of a real empty
                     state said something had gone wrong. role="status" so the
                     filter change is announced rather than silently emptying
                     the list. */
                  <div className={styles.filterEmpty} role="status">
                    <p className={styles.filterEmptyText}>
                      {t("create_survey.empty_state_message")}
                    </p>
                    <button
                      type="button"
                      className={styles.filterEmptyAction}
                      onClick={() => {
                        setPage(1);
                        setStatus("all");
                      }}
                    >
                      {t("reset_filter")}
                    </button>
                  </div>
                ) : (
                  <DashboardEmptyState
                    onCreateSurvey={handleCreateSurveyClick}
                    onImportTemplate={handleImportSurveyClick}
                    /* Same gate as the action cards, which this now stands in
                       for: an analyst gets the welcome without actions it
                       can't carry out. */
                    canCreate={actions.length > 0}
                  />
                )}
              </>
            ) : (
              <LoadingDots fullHeight />
            )}
          </Box>

          {surveys?.totalCount > MIN_ROWS_PER_PAGE ? (
            <TablePagination
              className={styles.pagination}
              rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
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
          confirmLabel={t("action_btn.delete_survey")}
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
        open={Boolean(notice)}
        autoHideDuration={6000}
        onClose={() => setNotice(null)}
      >
        <Alert
          onClose={() => setNotice(null)}
          severity={notice?.severity ?? "error"}
        >
          {notice?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Dashboard;
