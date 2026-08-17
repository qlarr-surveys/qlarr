import React, { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  TablePagination,
  Typography,
  FormControl,
  Skeleton,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Grid,
  Tabs,
  Tab,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import styles from "./ResponsesSurvey.module.css";
import {
  formatlocalDateTime,
  serverDateTimeToLocalDateTime,
} from "~/utils/DateUtils";
import ConfirmActionModal from "~/components/common/ConfirmActionModal";
import { RHFSelect } from "~/components/hook-form";
import LoadingDots from "~/components/common/LoadingDots";
import { useService } from "~/hooks/use-service";
import ResponsesDownload from "~/components/manage/ResponsesDownload";
import ResponsesExport from "~/components/manage/ResponsesExport";
import ResponseEvents from "~/components/manage/ResponseEvents";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import {
  previewUrlByFilename,
  previewUrlByResponseIdAndCode,
} from "~/networking/run";

function InfoItem({ label, value }) {
  return (
    <Box
      display="grid"
      gridTemplateColumns={{ xs: "1fr 2fr", sm: "1fr 2fr", md: "160px 1fr" }}
      gap={1}
      py={0.5}
    >
      <Typography color="text.secondary" fontWeight={500}>
        {label}
      </Typography>
      <Typography component="div">{value ?? "—"}</Typography>
    </Box>
  );
}

function ClampTwoLines({ children, sx }) {
  return (
    <Box
      sx={{
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        textOverflow: "ellipsis",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

function ResponsesList() {
  const surveyService = useService("survey");
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const { surveyId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlResponseId = searchParams.get("responseId");

  const [fetching, setFetching] = useState(true);
  const [status, setStatus] = useState("all");
  const [surveyor, setSurveyor] = useState(null);

  const [allResponse, setAllResponse] = useState(null);
  const [responseId, setResponseId] = useState(() => {
    if (urlResponseId) return urlResponseId;
    const stored = sessionStorage.getItem("responseId");
    return stored ? stored : null;
  });
  // When responseId arrived via URL, the first fetch's "not in current page"
  // check would clear it before getResponseById can resolve. Skip that clear
  // exactly once so cross-tab navigation from the preview screen works.
  const skipNextResponseClearRef = useRef(!!urlResponseId);
  useEffect(() => {
    if (!urlResponseId) return;
    const next = new URLSearchParams(searchParams);
    next.delete("responseId");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [eventsData, setEventsData] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [canExportFiles, setCanExportFiles] = useState(false);
  const [askedAboutFiles, setAskedAboutFiles] = useState(false);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [exportDlgOpen, setExportDlgOpen] = useState(false);
  const [downloadDlgOpen, setDownloadDlgOpen] = useState(false);
  const firstFetchThisVisitRef = useRef(true);

  const processApirror = () => setFetching(false);

  const fetchResponses = (deleted = false) => {
    setFetching(true);

    const confirmFilesExport = firstFetchThisVisitRef.current === true;

    surveyService
      .allResponse(
        surveyId,
        page,
        rowsPerPage,
        status,
        surveyor,
        !askedAboutFiles,
      )
      .then((data) => {
        if (data) {
          setAskedAboutFiles(true);
          const totalPages = Math.ceil(data.totalCount / rowsPerPage) || 1;
          const newPage = page > totalPages ? totalPages : page;
          if (deleted && page > totalPages) setPage(newPage);
          if (!askedAboutFiles) {
            setAskedAboutFiles(true);
            setCanExportFiles(data.canExportFiles);
          }
          setAllResponse(data);
          if (responseId && !data.responses?.some((r) => r.id === responseId)) {
            if (skipNextResponseClearRef.current) {
              skipNextResponseClearRef.current = false;
            } else {
              setResponseId(null);
              setSelected(null);
            }
          }
        }
        setFetching(false);
      })
      .catch((err) => {
        processApirror(err);
        console.error(err);
        setFetching(false);
      })
      .finally(() => {
        if (firstFetchThisVisitRef.current) {
          firstFetchThisVisitRef.current = false;
        }
      });
  };

  const isFileObj = (v) =>
    v &&
    typeof v === "object" &&
    "size" in v &&
    "filename" in v &&
    "stored_filename" in v;

  const getTooltipString = (val) => {
    if (val === null || val === undefined || val === "") return "—";
    if (Array.isArray(val) && val.every(isFileObj)) {
      return val
        .map((f) => `${f.filename} (${Math.round(f.size / 1000)}K)`)
        .join(", ");
    }
    if (isFileObj(val)) {
      return `${val.filename} (${Math.round(val.size / 1000)}K)`;
    }
    if (typeof val === "object") return JSON.stringify(val, null, 2);
    return String(val);
  };

  const renderAnswerClamped = (code, respId, val) => {
    if (val === null || val === undefined || val === "") {
      return <Typography variant="body2">—</Typography>;
    }

    if (Array.isArray(val) && val.every(isFileObj)) {
      return (
        <ClampTwoLines>
          <Box display="inline" sx={{ wordBreak: "break-word" }}>
            {val.map((file, idx) => (
              <React.Fragment key={file.stored_filename}>
                {idx > 0 ? ", " : null}
                {renderFileLink(code, respId, file)}
              </React.Fragment>
            ))}
          </Box>
        </ClampTwoLines>
      );
    }

    if (isFileObj(val)) {
      return (
        <ClampTwoLines>
          <Box display="inline" sx={{ wordBreak: "break-word" }}>
            {renderFileLink(code, respId, val)}
          </Box>
        </ClampTwoLines>
      );
    }

    if (typeof val === "object") {
      return (
        <ClampTwoLines>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {JSON.stringify(val)}
          </Typography>
        </ClampTwoLines>
      );
    }

    return (
      <ClampTwoLines>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {String(val)}
        </Typography>
      </ClampTwoLines>
    );
  };

  const getQuestionCodeFromKey = (key) => {
    if (!key) return "";
    const first = String(key).split(".")[0].trim();
    const m = first.match(/[A-Za-z]+[A-Za-z0-9]*/);
    return (m && m[0]) || first;
  };

  const renderFileLink = (code, respId, file) => {
    return (
      <a
        key={file.stored_filename}
        target="_blank"
        rel="noreferrer"
        download={file.stored_filename}
        href={previewUrlByResponseIdAndCode(respId, code)}
        style={{ wordBreak: "break-all" }}
      >
        {file.filename} — {Math.round(file.size / 1000)}K
      </a>
    );
  };

  const getVoiceRecordings = (events) => {
    if (!Array.isArray(events)) return [];
    return events.filter((e) => e.name === "VoiceRecording");
  };

  const getLocations = (events) => {
    if (!Array.isArray(events)) return [];
    return events.filter((e) => e.name === "Location");
  };

  const formatEventTime = (time) => {
    if (!time) return "—";

    let date = null;

    // Handle array format: [year, month, day, hour, minute, second]
    if (Array.isArray(time) && time.length >= 6) {
      date = new Date(time[0], time[1] - 1, time[2], time[3], time[4], time[5]);
    }
    // Handle object format (Java LocalDateTime serialization)
    else if (typeof time === "object" && time.year !== undefined) {
      date = new Date(
        time.year,
        (time.monthValue || time.month) - 1,
        time.dayOfMonth || time.day,
        time.hour || 0,
        time.minute || 0,
        time.second || 0,
      );
    }
    // Handle ISO string format
    else if (typeof time === "string") {
      date = serverDateTimeToLocalDateTime(time);
    }

    if (!date || isNaN(date.getTime())) return "—";
    return formatlocalDateTime(date);
  };

  const renderVoiceRecordings = (respId, events) => {
    const recordings = getVoiceRecordings(events);
    if (recordings.length === 0) return "—";
    return (
      <Box display="flex" flexDirection="column" gap={1}>
        {recordings.map((recording, index) => (
          <Box key={recording.fileName || index}>
            <Typography variant="body2" color="text.secondary" mb={0.5}>
              {t("responses.recording")} {index + 1} —{" "}
              {formatEventTime(recording.time)}
            </Typography>
            <audio controls style={{ width: "100%", maxWidth: 300 }}>
              <source
                src={previewUrlByFilename(recording.fileName)}
                type="audio/mp4"
              />
              {t(
                "responses.audio_not_supported",
                "Your browser does not support audio playback",
              )}
            </audio>
          </Box>
        ))}
      </Box>
    );
  };

  const renderLocations = (events) => {
    const locations = getLocations(events);
    if (locations.length === 0) return "—";
    return (
      <Box display="flex" flexDirection="column" gap={0.5}>
        {locations.map((location, index) => (
          <Typography key={index} sx={{ wordBreak: "break-word" }}>
            {formatEventTime(location.time)} — <strong>Lat:</strong>{" "}
            {location.latitude}, <strong>Long:</strong> {location.longitude}
          </Typography>
        ))}
      </Box>
    );
  };

  useEffect(() => {
    firstFetchThisVisitRef.current = true;
  }, [surveyId]);

  useEffect(() => {
    fetchResponses();
  }, [page, rowsPerPage, status, surveyor]);

  useEffect(() => {
    if (!responseId || !allResponse || selected?.id == responseId) return;
    surveyService
      .getResponseById(responseId)
      .then((data) => {
        setSelected(data);
        sessionStorage.setItem("responseId", responseId);
      })
      .catch((err) => {
        console.error(err);
        setResponseId(null);
        setSelected(null);
      });
  }, [responseId, allResponse]);

  useEffect(() => {
    if (activeTab === 1 && responseId && !eventsData) {
      setLoadingEvents(true);
      surveyService
        .getResponseWithEvents(responseId)
        .then((data) => {
          setEventsData(data);
          setLoadingEvents(false);
        })
        .catch((err) => {
          console.error(err);
          setLoadingEvents(false);
        });
    }
  }, [activeTab, responseId]);

  useEffect(() => {
    setEventsData(null);
    setActiveTab(0);
  }, [responseId]);

  const [responseToDelete, setResponseToDelete] = useState(null);
  const onCloseModal = () => setResponseToDelete(null);
  const deleteResponse = () => {
    if (!responseToDelete) return;
    const deletedId = responseToDelete.id;
    onCloseModal();
    surveyService
      .deleteResponse(surveyId, deletedId)
      .then(() => {
        if (responseId === deletedId) {
          setResponseId(null);
          setSelected(null);
        }
        fetchResponses(true);
      })
      .catch(processApirror);
  };

  const onSurveyorClicked = (response) => {
    setStatus("all");
    setSurveyor(response.surveyorID || null);
  };

  if (fetching && !allResponse) {
    return (
      <div className={styles.loadingWrapper}>
        <LoadingDots fullHeight />
      </div>
    );
  }

  const renderEventsCell = (events) => {
    if (!Array.isArray(events) || events.length === 0) {
      return <Typography>—</Typography>;
    }

    let accumulatedMs = 0;

    return (
      <Box sx={{ maxHeight: 200, overflow: "auto", pr: 1 }}>
        {events.map((e, idx) => {
          const { time, name, timeMillis } = e || {};
          const formattedDate = formatEventTime(time);

          const prettyName =
            {
              START: "Started",
              NEXT: "Next Page",
              RESUME: "Resumed",
              Value: "Answered",
            }[name] ||
            name ||
            "—";

          accumulatedMs += timeMillis ?? 0;
          const timeSinceLastEvent =
            typeof timeMillis === "number"
              ? `+${(timeMillis / 1000).toFixed(1)}s`
              : "";

          return (
            <Box
              key={idx}
              display="flex"
              flexWrap="wrap"
              alignItems="center"
              justifyContent="space-between"
              py={0.5}
              sx={{
                borderBottom:
                  idx < events.length - 1
                    ? "1px dashed rgba(0,0,0,0.08)"
                    : "none",
              }}
            >
              <Typography fontWeight={600}>{prettyName}</Typography>
              <Typography color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                {formattedDate}
              </Typography>
              <Box display="flex" gap={1}>
                {timeSinceLastEvent && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={timeSinceLastEvent}
                    sx={{ fontSize: "0.75rem" }}
                  />
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <>
      <ResponsesExport
        open={exportDlgOpen}
        onClose={() => setExportDlgOpen(false)}
        currentFrom={
          allResponse?.responses?.length > 0
            ? allResponse.responses[0].index
            : 1
        }
        currentTo={
          allResponse?.responses?.length > 0
            ? allResponse.responses[allResponse.responses.length - 1].index
            : 1
        }
        t={t}
      />

      <ResponsesDownload
        open={downloadDlgOpen}
        onClose={() => setDownloadDlgOpen(false)}
        currentFrom={
          allResponse?.responses?.length > 0
            ? allResponse.responses[0].index
            : 1
        }
        currentTo={
          allResponse?.responses?.length > 0
            ? allResponse.responses[allResponse.responses.length - 1].index
            : 1
        }
        t={t}
      />

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {surveyor && (
          <Box mb={1}>
            <Button sx={{ m: 1 }} onClick={() => setSurveyor(null)}>
              {t("responses.reset_surveyor_filter")}
            </Button>
          </Box>
        )}

        <Box
          display="grid"
          gridTemplateColumns={{ xs: "1fr", md: "500px 1fr" }}
          gap={2}
          minHeight={520}
          sx={{ flex: 1, overflow: "hidden" }}
        >
          <Paper
            elevation={0}
            variant="outlined"
            sx={{
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box px={2} py={1.5}>
              <Grid container spacing={2} alignItems="flex-start">
                <Grid item xs={12} sm={6}>
                  <FormControl size="small" fullWidth>
                    <RHFSelect
                      label={t("responses.filter_by_type")}
                      value={status}
                      onChange={(e) => {
                        setPage(1);
                        setStatus(e.target.value);
                      }}
                    >
                      <MenuItem value="all">
                        {t("responses.filter_completed_show_all")}
                      </MenuItem>
                      <MenuItem value="preview">
                        {t("responses.filter_preview_show_preview")}
                      </MenuItem>
                      <MenuItem value="complete">
                        {t("responses.filter_completed_show_completed")}
                      </MenuItem>
                      <MenuItem value="incomplete">
                        {t("responses.filter_completed_show_incomplete")}
                      </MenuItem>
                    </RHFSelect>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => setExportDlgOpen(true)}
                    >
                      {t("responses.export")}
                    </Button>

                    {canExportFiles && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => setDownloadDlgOpen(true)}
                      >
                        {t("responses.download")}
                      </Button>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Box>
            <Divider />
            {fetching ? (
              <Box p={2}>
                {[...Array(8)].map((_, i) => (
                  <Box
                    key={i}
                    display="flex"
                    alignItems="center"
                    gap={2}
                    py={1}
                  >
                    <Skeleton variant="rounded" width={28} height={24} />
                    <Skeleton variant="text" width="50%" />
                    <Skeleton
                      variant="rounded"
                      width={80}
                      height={22}
                      style={{ marginLeft: "auto" }}
                    />
                  </Box>
                ))}
              </Box>
            ) : (
              <>
                <List dense disablePadding sx={{ overflowY: "auto", flex: 1 }}>
                  {allResponse?.responses.map((r) => {
                    const isSelected = responseId && responseId === r.id;

                    return (
                      <ListItemButton
                        key={r.id}
                        selected={isSelected}
                        onClick={() => {
                          console.log("setResponseId", r.id);
                          setResponseId(r.id);
                        }}
                        sx={{ alignItems: "flex-start" }}
                      >
                        <ListItemText
                          primary={
                            <Box display="flex" gap={1} alignItems="center">
                              <Typography fontWeight={600}>
                                #{r.index}
                              </Typography>
                              {r.preview ? (
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={t("responses.preview")}
                                />
                              ) : r.submitDate ? (
                                <Typography
                                  variant="body2"
                                  color="success.main"
                                  fontWeight={500}
                                >
                                  {t("responses.complete_response")}
                                </Typography>
                              ) : (
                                <Typography
                                  variant="body2"
                                  color="warning.main"
                                  fontWeight={500}
                                >
                                  {t("responses.incomplete_response")}
                                </Typography>
                              )}
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography variant="body2">
                                {formatlocalDateTime(
                                  serverDateTimeToLocalDateTime(r.startDate),
                                )}
                              </Typography>
                              {r.surveyorName && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {t("label.surveyor")}:{" "}
                                  <Link
                                    to="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      onSurveyorClicked(r);
                                    }}
                                  >
                                    {r.surveyorName}
                                  </Link>
                                </Typography>
                              )}
                            </>
                          }
                        />
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setResponseToDelete(r);
                          }}
                          aria-label="delete"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemButton>
                    );
                  })}
                </List>

                <Divider />
                <TablePagination
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  component="div"
                  labelDisplayedRows={({ from, to, count }) =>
                    t("responses.label_displayed_rows", { from, to, count })
                  }
                  labelRowsPerPage={t("responses.label_rows_per_page")}
                  count={allResponse?.totalCount || 0}
                  rowsPerPage={rowsPerPage}
                  page={page - 1}
                  onPageChange={(_, newPage) => setPage(newPage + 1)}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(1);
                  }}
                />
              </>
            )}
          </Paper>

          <Paper
            elevation={0}
            variant="outlined"
            sx={{ p: 2, overflow: "auto" }}
          >
            {!selected ? (
              <Box p={4} textAlign="center">
                <Typography color="text.secondary">
                  {t("responses.no_selection", "Select a response")}
                </Typography>
              </Box>
            ) : (
              <Box display="flex" flexDirection="column" gap={3}>
                <Box
                  display="grid"
                  gridTemplateColumns={{ xs: "1fr", lg: "1fr 1fr" }}
                >
                  <InfoItem label="ID" value={`#${selected.index}`} />
                  <InfoItem
                    label={t("label.surveyor")}
                    value={
                      selected.surveyorName ? (
                        <Link
                          to="#"
                          onClick={(e) => {
                            e.preventDefault();
                            onSurveyorClicked(selected);
                          }}
                        >
                          {selected.surveyorName}
                        </Link>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <InfoItem
                    label={t("responses.ip_addr")}
                    value={selected.ipAddress || "—"}
                  />
                  <InfoItem
                    label={t("responses.start_date")}
                    value={formatlocalDateTime(
                      serverDateTimeToLocalDateTime(selected.startDate),
                    )}
                  />
                  <InfoItem
                    label={t("responses.submit_date")}
                    value={
                      selected.submitDate
                        ? formatlocalDateTime(
                            serverDateTimeToLocalDateTime(selected.submitDate),
                          )
                        : "—"
                    }
                  />
                  <InfoItem
                    label={t("responses.lang")}
                    value={t(`language.${selected.lang}`) || "—"}
                  />
                  <InfoItem
                    label={t("responses.status") || "Status"}
                    value={
                      selected.preview ? (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={t("responses.preview")}
                        />
                      ) : selected.submitDate ? (
                        <Typography
                          variant="body2"
                          color="success.main"
                          fontWeight={500}
                        >
                          {t("responses.complete_response")}
                        </Typography>
                      ) : (
                        <Typography
                          variant="body2"
                          color="warning.main"
                          fontWeight={500}
                        >
                          {t("responses.incomplete_response")}
                        </Typography>
                      )
                    }
                  />
                  <InfoItem
                    label={t("responses.disqualified")}
                    value={
                      selected.disqualified
                        ? t("responses.yes")
                        : t("responses.no")
                    }
                  />
                  <InfoItem
                    label={t("responses.voice_recordings")}
                    value={renderVoiceRecordings(selected.id, selected.events)}
                  />
                  <InfoItem
                    label={t("responses.locations")}
                    value={renderLocations(selected.events)}
                  />
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                    <Tabs
                      value={activeTab}
                      onChange={(_, newValue) => setActiveTab(newValue)}
                    >
                      <Tab label={t("responses.answers", "Answers")} />
                      <Tab label={t("responses.events", "Events")} />
                    </Tabs>
                  </Box>

                  {activeTab === 0 && (
                    <Box sx={{ py: 2 }}>
                      {selected.values && selected.values.length > 0 ? (
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small" aria-label={t("aria.answers_table")}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ width: "50%", backgroundColor: "#212B36", color: "white" }}>
                                  {t("responses.question")}
                                </TableCell>
                                <TableCell sx={{ width: "50%", backgroundColor: "#212B36", color: "white" }}>
                                  {t("responses.answer")}
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {selected.values.map((val) => {
                                const answerTooltip = getTooltipString(val.value);
                                const questionTooltip = getTooltipString(val.key);
                                return (
                                  <TableRow
                                    key={val.code}
                                    hover
                                    sx={{
                                      backgroundColor: val.code.startsWith("G") ? "action.hover" : "transparent",
                                    }}
                                  >
                                    <TableCell
                                      colSpan={val.code.startsWith("G") ? 2 : 1}
                                      sx={{
                                        verticalAlign: "top",
                                        maxWidth: 0,
                                      }}
                                    >
                                      <ClampTwoLines>
                                        <CustomTooltip
                                          showIcon={false}
                                          title={questionTooltip}
                                        >
                                          <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            fontWeight={val.code.startsWith("G") ? 700 : 400}
                                            sx={{
                                              wordBreak: "break-word",
                                              whiteSpace: "pre-wrap",
                                            }}
                                          >
                                            {val.key}
                                          </Typography>
                                        </CustomTooltip>
                                      </ClampTwoLines>
                                    </TableCell>
                                    {!val.code.startsWith("G") && (
                                      <TableCell
                                        sx={{
                                          verticalAlign: "top",
                                          maxWidth: 0,
                                        }}
                                      >
                                        {answerTooltip.length > 20 ? (
                                          <CustomTooltip
                                            showIcon={false}
                                            title={answerTooltip}
                                          >
                                            <Box>
                                              {renderAnswerClamped(
                                                val.code,
                                                selected.id,
                                                val.value,
                                              )}
                                            </Box>
                                          </CustomTooltip>
                                        ) : (
                                          <Box>
                                            {renderAnswerClamped(
                                              val.code,
                                              selected.id,
                                              val.value,
                                            )}
                                          </Box>
                                        )}
                                      </TableCell>
                                    )}
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Box p={4} textAlign="center">
                          <Typography color="text.secondary">
                            {t("responses.no_answers", "No answers found")}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}

                  {activeTab === 1 && (
                    <Box sx={{ py: 2 }}>
                      <ResponseEvents events={eventsData} loading={loadingEvents} />
                    </Box>
                  )}
                </Box>
              </Box>
            )}
          </Paper>
          {Boolean(responseToDelete) && (
            <ConfirmActionModal
              open={Boolean(responseToDelete)}
              onClose={onCloseModal}
              onConfirm={deleteResponse}
              title={t("responses.title_delete_response")}
              cancelLabel={t("action_btn.cancel")}
              confirmLabel={t("action_btn.delete")}
            />
          )}
        </Box>
      </Box>
    </>
  );
}

export default React.memo(ResponsesList);
