import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { Alert, CircularProgress, Skeleton, Snackbar } from "@mui/material";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Ellipsis,
  Trash2,
  Upload,
} from "lucide-react";
import styles from "./ResponsesSurvey.module.css";
import {
  formatlocalDateTime,
  serverDateTimeToLocalDateTime,
} from "~/utils/DateUtils";
import ConfirmActionModal from "~/components/common/ConfirmActionModal";
import LoadingDots from "~/components/common/LoadingDots";
import { useService } from "~/hooks/use-service";
import ResponsesDownload, {
  downloadResponseFilesZip,
} from "~/components/manage/ResponsesDownload";
import { PROCESSED_ERRORS } from "~/utils/errorsProcessor";
import ResponsesExport, {
  exportResponsesFile,
} from "~/components/manage/ResponsesExport";
import ResponseEvents from "~/components/manage/ResponseEvents";
import CalculationValue from "~/components/manage/CalculationValue";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { escapeHtml } from "~/utils/escapeHtml";
import {
  previewUrlByFilename,
  previewUrlByResponseIdAndCode,
} from "~/networking/run";

// A label and its value in the response's details. Dates and addresses are
// read left to right in every language; the rest follows its own text.
function MetaItem({ label, children, ltr, wide }) {
  return (
    <div className={`${styles.metaItem} ${wide ? styles.metaWide : ""}`}>
      <dt className={styles.metaKey}>{label}</dt>
      <dd className={styles.metaVal} dir={ltr ? "ltr" : "auto"}>
        {children ?? "—"}
      </dd>
    </div>
  );
}

const STATUS_FILTERS = [
  ["all", "responses.filter_completed_show_all"],
  ["preview", "responses.filter_preview_show_preview"],
  ["complete", "responses.filter_completed_show_completed"],
  ["incomplete", "responses.filter_completed_show_incomplete"],
  ["disqualified", "responses.filter_completed_show_disqualified"],
];

// One status per response, in the order the list has always checked them.
const statusOf = (response) =>
  response.preview
    ? "preview"
    : response.disqualified
      ? "disqualified"
      : response.submitDate
        ? "complete"
        : "incomplete";

const STATUS_LABELS = {
  preview: ["responses.status_preview", "Preview"],
  complete: ["responses.status_complete", "Complete"],
  incomplete: ["responses.status_incomplete", "Incomplete"],
  disqualified: ["responses.disqualified", "Disqualified"],
};

const PAGE_SIZES = [25, 50, 100];
const PAGE_SIZE_KEY = "responses_rows_per_page";

const readPageSize = () => {
  try {
    const stored = Number(localStorage.getItem(PAGE_SIZE_KEY));
    return PAGE_SIZES.includes(stored) ? stored : PAGE_SIZES[0];
  } catch {
    // Private windows and blocked site data throw on access.
    return PAGE_SIZES[0];
  }
};

const writePageSize = (value) => {
  try {
    localStorage.setItem(PAGE_SIZE_KEY, String(value));
  } catch {
    // Kept for this visit either way.
  }
};

function ResponsesList({ refreshKey, onTotalChange }) {
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

  // "Show more" adds the pages after `page` to the list, up to `lastPage`.
  const [paging, setPaging] = useState(() => ({
    page: 1,
    lastPage: 1,
    rowsPerPage: readPageSize(),
  }));
  const { page, lastPage, rowsPerPage } = paging;
  const goToPage = (newPage) =>
    setPaging((prev) => ({ ...prev, page: newPage, lastPage: newPage }));
  const [loadingMore, setLoadingMore] = useState(false);

  const [exportDlgOpen, setExportDlgOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState({ open: false });
  const [downloadDlgOpen, setDownloadDlgOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const firstFetchThisVisitRef = useRef(true);

  const processApirror = () => setFetching(false);

  // The list stays usable during some fetches, so a fetch that ends reads the
  // selection as it is then.
  const responseIdRef = useRef(responseId);
  responseIdRef.current = responseId;

  // Set before a fetch that should leave the list, and its scroll, in place.
  const keepListRef = useRef(false);

  // Where in the list the next fetch selects when nothing is selected: the
  // place of a deleted response, so the one after it (or the last) takes over.
  const fallbackIndexRef = useRef(0);

  // Counts fetches, so one a later fetch has overtaken is dropped.
  const fetchIdRef = useRef(0);

  const fetchResponses = () => {
    const fetchId = ++fetchIdRef.current;
    if (!keepListRef.current) setFetching(true);
    keepListRef.current = false;

    const confirmFilesExport = firstFetchThisVisitRef.current === true;

    const pages = Array.from(
      { length: lastPage - page + 1 },
      (_, i) => page + i,
    );

    Promise.all(
      pages.map((pageNumber, i) =>
        surveyService.allResponse(
          surveyId,
          pageNumber,
          rowsPerPage,
          status,
          surveyor,
          i === 0 && !askedAboutFiles,
        ),
      ),
    )
      .then((results) => {
        if (fetchId !== fetchIdRef.current) return;
        const data = results[0] && {
          ...results[0],
          responses: results.flatMap((result) => result?.responses || []),
        };
        if (data) {
          setAskedAboutFiles(true);
          if (!askedAboutFiles) {
            setAskedAboutFiles(true);
            setCanExportFiles(data.canExportFiles);
          }
          // Unfiltered, the total is every response the survey has.
          if (status === "all" && !surveyor) {
            onTotalChange?.(data.totalCount);
          }
          const totalPages = Math.ceil(data.totalCount / rowsPerPage) || 1;
          if (lastPage > totalPages) {
            // Refetches: the rows of these pages are gone.
            keepListRef.current = page <= totalPages;
            if (page > totalPages && !responseIdRef.current) {
              fallbackIndexRef.current = Infinity;
            }
            setPaging((prev) => ({
              ...prev,
              page: Math.min(prev.page, totalPages),
              lastPage: Math.min(prev.lastPage, totalPages),
            }));
            return;
          }
          setAllResponse(data);
          const fallbackIndex = Math.min(
            fallbackIndexRef.current,
            data.responses.length - 1,
          );
          fallbackIndexRef.current = 0;
          const fallbackId = data.responses[fallbackIndex]?.id ?? null;
          const currentId = responseIdRef.current;
          if (!currentId) {
            setResponseId(fallbackId);
          } else if (!data.responses?.some((r) => r.id === currentId)) {
            if (skipNextResponseClearRef.current) {
              skipNextResponseClearRef.current = false;
            } else {
              setResponseId(fallbackId);
              setSelected(null);
            }
          }
        }
        setFetching(false);
      })
      .catch((err) => {
        console.error(err);
        if (fetchId !== fetchIdRef.current) return;
        processApirror(err);
        setFetching(false);
      })
      .finally(() => {
        if (fetchId !== fetchIdRef.current) return;
        setLoadingMore(false);
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

  // The tooltip renders its title as HTML, and answers are whatever a
  // respondent typed: callers escape this before handing it over.
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
      return <span className={styles.empty}>—</span>;
    }

    if (Array.isArray(val) && val.every(isFileObj)) {
      return (
        <div className={styles.clamp}>
          {val.map((file, idx) => (
            <React.Fragment key={file.stored_filename}>
              {idx > 0 ? ", " : null}
              {renderFileLink(code, respId, file)}
            </React.Fragment>
          ))}
        </div>
      );
    }

    if (isFileObj(val)) {
      return (
        <div className={styles.clamp}>{renderFileLink(code, respId, val)}</div>
      );
    }

    return (
      <div className={styles.clamp}>
        <bdi>{typeof val === "object" ? JSON.stringify(val) : String(val)}</bdi>
      </div>
    );
  };

  const renderFileLink = (code, respId, file) => {
    return (
      <a
        key={file.stored_filename}
        target="_blank"
        rel="noreferrer"
        download={file.stored_filename}
        href={previewUrlByResponseIdAndCode(respId, code)}
        className={styles.fileLink}
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

  const renderVoiceRecordings = (events) => {
    const recordings = getVoiceRecordings(events);
    if (recordings.length === 0) return "—";
    return (
      <div className={styles.metaLines}>
        {recordings.map((recording, index) => (
          <div key={recording.fileName || index}>
            <span className={styles.metaNote}>
              {t("responses.recording")} {index + 1} —{" "}
              <span dir="ltr">{formatEventTime(recording.time)}</span>
            </span>
            <audio controls className={styles.audio}>
              <source
                src={previewUrlByFilename(recording.fileName)}
                type="audio/mp4"
              />
              {t(
                "responses.audio_not_supported",
                "Your browser does not support audio playback",
              )}
            </audio>
          </div>
        ))}
      </div>
    );
  };

  const renderLocations = (events) => {
    const locations = getLocations(events);
    if (locations.length === 0) return "—";
    return (
      <div className={styles.metaLines}>
        {locations.map((location, index) => (
          <span key={index} dir="ltr">
            {formatEventTime(location.time)} — <strong>Lat:</strong>{" "}
            {location.latitude}, <strong>Long:</strong> {location.longitude}
          </span>
        ))}
      </div>
    );
  };

  useEffect(() => {
    firstFetchThisVisitRef.current = true;
  }, [surveyId]);

  useEffect(() => {
    fetchResponses();
  }, [paging, status, surveyor]);

  // Refetch the page and the open response when the parent asks (refreshKey
  // changes; 0 is the first render, already fetched above). The page fetch
  // may deselect the response meanwhile; only replace it if still open.
  useEffect(() => {
    if (!refreshKey) return;
    fetchResponses();
    if (!responseId) return;
    surveyService
      .getResponseById(responseId)
      .then((data) =>
        setSelected((prev) => (prev?.id == data?.id ? data : prev)),
      )
      .catch((err) => console.error(err));
  }, [refreshKey]);

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
        if (responseIdRef.current === deletedId) {
          fallbackIndexRef.current = Math.max(
            allResponse.responses.findIndex((r) => r.id === deletedId),
            0,
          );
          setResponseId(null);
          setSelected(null);
        }
        setAllResponse((prev) => ({
          ...prev,
          responses: prev.responses.filter((r) => r.id !== deletedId),
        }));
        // A filtered refetch doesn't report the survey's total, so count the
        // deletion here.
        onTotalChange?.((total) => (total === null ? total : total - 1));
        // Refetches with the page and filters as they are now.
        keepListRef.current = true;
        setPaging((prev) => ({ ...prev }));
      })
      .catch(processApirror);
  };

  const onSurveyorClicked = (response) => {
    goToPage(1);
    setStatus("all");
    setSurveyor(response.surveyorID || null);
  };

  if (fetching && !allResponse) {
    return (
      <div className={styles.loading}>
        <LoadingDots fullHeight />
      </div>
    );
  }

  const closeNotice = () => setNotice((n) => ({ ...n, open: false }));
  const notifyNoResponses = () =>
    setNotice({
      open: true,
      severity: "warning",
      message: t("responses.no_responses_found"),
    });
  const notifyNoFiles = () =>
    setNotice({
      open: true,
      severity: "warning",
      message: t("responses.no_files_found"),
    });
  const notifyFilesSizeLimit = () =>
    setNotice({
      open: true,
      severity: "error",
      message: t("processed_errors.size_limit_exceeded"),
    });

  const quickDownloadFiles = async () => {
    setDownloading(true);
    try {
      const downloaded = await downloadResponseFilesZip(
        surveyService,
        surveyId,
      );
      if (!downloaded) notifyNoFiles();
    } catch (e) {
      if (e?.name === PROCESSED_ERRORS.SIZE_LIMIT_EXCEEDED.name) {
        notifyFilesSizeLimit();
        setDownloadDlgOpen(true);
      }
    } finally {
      setDownloading(false);
    }
  };

  const totalCount = allResponse?.totalCount || 0;

  const quickExport = async () => {
    setExporting(true);
    try {
      const exported = await exportResponsesFile(surveyService, surveyId);
      if (!exported) notifyNoResponses();
    } catch (e) {
      // already surfaced by the service's global error handler
    } finally {
      setExporting(false);
    }
  };

  const responses = allResponse?.responses || [];

  // Previous and next walk the responses loaded in the list.
  const selectedAt = responses.findIndex((r) => r.id === responseId);
  const previousResponse = selectedAt > 0 ? responses[selectedAt - 1] : null;
  const nextResponse =
    selectedAt >= 0 && selectedAt < responses.length - 1
      ? responses[selectedAt + 1]
      : null;

  const statusLabel = (response) => {
    const [key, fallback] = STATUS_LABELS[statusOf(response)];
    return t(key, fallback);
  };

  const formatDate = (date) =>
    formatlocalDateTime(serverDateTimeToLocalDateTime(date));

  const rangeFrom = totalCount === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const rangeTo = Math.min(lastPage * rowsPerPage, totalCount);

  const renderSurveyorLink = (response) => (
    <button
      type="button"
      className={styles.link}
      onClick={() => onSurveyorClicked(response)}
    >
      {response.surveyorName}
    </button>
  );

  const renderExplorer = () => (
    <nav aria-label={t("responses.title")} className={styles.explorer}>
      <div className={styles.tools}>
        <label className={styles.selectWrap}>
          <span className={styles.srOnly}>{t("responses.filter_by_type")}</span>
          <select
            className={styles.select}
            title={t("responses.filter_by_type")}
            value={status}
            onChange={(e) => {
              goToPage(1);
              setStatus(e.target.value);
            }}
          >
            {STATUS_FILTERS.map(([value, label]) => (
              <option key={value} value={value}>
                {t(label)}
              </option>
            ))}
          </select>
          <span aria-hidden="true" className={styles.selectChevron}>
            <ChevronDown size={16} strokeWidth={2} />
          </span>
        </label>

        <div className={styles.actions}>
          <div className={styles.split}>
            <button
              type="button"
              className={styles.splitMain}
              disabled={exporting}
              onClick={quickExport}
              title={t("responses.export")}
            >
              <Upload size={15} strokeWidth={2} aria-hidden="true" />
              <span className={styles.splitLabel}>
                {t("responses.export_button", "Export")}
              </span>
            </button>
            <button
              type="button"
              className={styles.splitMore}
              aria-label={t("responses.export_options")}
              title={t("responses.export_options")}
              onClick={() => setExportDlgOpen(true)}
            >
              <Ellipsis size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          {canExportFiles && (
            <div className={styles.split}>
              <button
                type="button"
                className={styles.splitMain}
                disabled={downloading}
                onClick={quickDownloadFiles}
                title={t("responses.download_files")}
              >
                <Download size={15} strokeWidth={2} aria-hidden="true" />
                <span className={styles.splitLabel}>
                  {t("responses.download_button", "Download")}
                </span>
              </button>
              <button
                type="button"
                className={styles.splitMore}
                aria-label={t("responses.download_options")}
                title={t("responses.download_options")}
                onClick={() => setDownloadDlgOpen(true)}
              >
                <Ellipsis size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {surveyor && (
          <button
            type="button"
            className={styles.resetFilter}
            onClick={() => setSurveyor(null)}
          >
            {t("responses.reset_surveyor_filter")}
          </button>
        )}
      </div>

      <div className={styles.listScroll}>
        {fetching ? (
          <div className={styles.list}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className={styles.skeletonRow}>
                <Skeleton variant="rounded" width={28} height={24} />
                <Skeleton variant="text" width="50%" />
                <Skeleton
                  variant="rounded"
                  width={80}
                  height={22}
                  style={{ marginInlineStart: "auto" }}
                />
              </div>
            ))}
          </div>
        ) : (
          <>
            <ul className={styles.list}>
              {responses.map((r) => {
                const isSelected = Boolean(responseId) && responseId === r.id;
                return (
                  <li
                    key={r.id}
                    className={`${styles.row} ${
                      isSelected ? styles.rowOn : ""
                    }`}
                  >
                    <div className={styles.rowBody}>
                      <button
                        type="button"
                        aria-current={isSelected ? "true" : undefined}
                        onClick={() => setResponseId(r.id)}
                        className={`${styles.rowMain} ${
                          r.surveyorName ? styles.rowMainTight : ""
                        }`}
                      >
                        <span className={styles.rowTop}>
                          <span className={styles.rowIndex}>#{r.index}</span>
                          <span className={styles.chip}>{statusLabel(r)}</span>
                        </span>
                        <span className={styles.rowDate}>
                          <span dir="ltr">{formatDate(r.startDate)}</span>
                        </span>
                      </button>
                      {r.surveyorName && (
                        <div className={styles.rowSurveyor}>
                          {t("label.surveyor")}: {renderSurveyorLink(r)}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className={styles.rowDelete}
                      onClick={() => setResponseToDelete(r)}
                      aria-label={t("responses.delete_response_n", {
                        index: r.index,
                        defaultValue: "Delete response #{{index}}",
                      })}
                      title={t("action_btn.delete")}
                    >
                      <Trash2 size={17} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>

            {lastPage * rowsPerPage < totalCount && (
              <div className={styles.more}>
                <button
                  type="button"
                  className={styles.moreBtn}
                  disabled={loadingMore}
                  onClick={() => {
                    setLoadingMore(true);
                    keepListRef.current = true;
                    setPaging((prev) => ({
                      ...prev,
                      lastPage: prev.lastPage + 1,
                    }));
                  }}
                >
                  {t("responses.show_more")}
                  {loadingMore && (
                    <CircularProgress size={14} color="inherit" />
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {!fetching && (
        <div className={styles.pager}>
          <label className={styles.pagerSize}>
            {t("responses.label_rows_per_page")}
            <span className={styles.pagerSelectWrap}>
              <select
                className={styles.pagerSelect}
                value={rowsPerPage}
                onChange={(e) => {
                  const size = parseInt(e.target.value, 10);
                  writePageSize(size);
                  setPaging({ page: 1, lastPage: 1, rowsPerPage: size });
                }}
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span aria-hidden="true" className={styles.selectChevron}>
                <ChevronDown size={14} strokeWidth={2} />
              </span>
            </span>
          </label>
          <div className={styles.pagerNav}>
            <span className={styles.pagerRange} aria-live="polite">
              {t("responses.label_displayed_rows", {
                from: rangeFrom,
                to: rangeTo,
                count: totalCount,
              })}
            </span>
            <button
              type="button"
              className={styles.pagerBtn}
              disabled={lastPage <= 1}
              aria-label={t("responses.previous_page", "Previous page")}
              title={t("responses.previous_page", "Previous page")}
              onClick={() => goToPage(Math.max(page - 1, 1))}
            >
              <ChevronLeft
                size={16}
                strokeWidth={2}
                className={styles.flip}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              className={styles.pagerBtn}
              disabled={lastPage * rowsPerPage >= totalCount}
              aria-label={t("responses.next_page", "Next page")}
              title={t("responses.next_page", "Next page")}
              onClick={() => goToPage(lastPage + 1)}
            >
              <ChevronRight
                size={16}
                strokeWidth={2}
                className={styles.flip}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      )}
    </nav>
  );

  const renderAnswers = () => (
    <>
      {selected.values && selected.values.length > 0 ? (
        <table className={styles.table} aria-label={t("aria.answers_table")}>
          <colgroup>
            <col style={{ width: "62%" }} />
            <col />
          </colgroup>
          <tbody>
            {selected.values.map((val) => {
              const isGroup = val.code.startsWith("G");
              const answerTooltip = getTooltipString(val.value);
              const questionTooltip = getTooltipString(val.key);
              if (isGroup) {
                return (
                  <tr key={val.code}>
                    <th
                      colSpan={2}
                      scope="colgroup"
                      className={styles.groupCell}
                    >
                      <bdi>{val.key}</bdi>
                    </th>
                  </tr>
                );
              }
              const answer = renderAnswerClamped(
                val.code,
                selected.id,
                val.value,
              );
              return (
                <tr key={val.code}>
                  <td className={styles.cell}>
                    <CustomTooltip
                      showIcon={false}
                      title={escapeHtml(questionTooltip)}
                    >
                      <div className={styles.clamp}>
                        <bdi>{val.key}</bdi>
                      </div>
                    </CustomTooltip>
                  </td>
                  <td className={`${styles.cell} ${styles.answerCell}`}>
                    {answerTooltip.length > 20 ? (
                      <CustomTooltip
                        showIcon={false}
                        title={escapeHtml(answerTooltip)}
                      >
                        <div>{answer}</div>
                      </CustomTooltip>
                    ) : (
                      answer
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className={styles.tabEmpty}>
          {t("responses.no_answers", "No answers found")}
        </div>
      )}

      {selected.calculations?.length > 0 && (
        <table className={styles.table}>
          <colgroup>
            <col style={{ width: "62%" }} />
            <col />
          </colgroup>
          <tbody>
            <tr>
              <th colSpan={2} scope="colgroup" className={styles.groupCell}>
                {t("calculations.title", "Calculated fields")}
              </th>
            </tr>
            {selected.calculations.map((calc) => (
              <tr key={calc.code}>
                <td className={styles.cell}>
                  <bdi>{calc.label}</bdi>
                </td>
                <td className={`${styles.cell} ${styles.answerCell}`}>
                  <CalculationValue state={calc.state} value={calc.value} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );

  const renderResponse = () => {
    const recordings = getVoiceRecordings(selected.events);
    const selectedStatus = statusOf(selected);
    return (
      <article className={styles.card} aria-labelledby="response-title">
        <div className={styles.cardHead}>
          <h2 id="response-title" className={styles.cardTitle}>
            {t("responses.response_title", {
              index: selected.index,
              defaultValue: "Response #{{index}}",
            })}
          </h2>
          <span
            className={`${styles.status} ${styles[`status_${selectedStatus}`]}`}
          >
            {statusLabel(selected)}
          </span>
          <span className={styles.headSpacer} />
          <div className={styles.headActions}>
            <button
              type="button"
              className={styles.stepBtn}
              disabled={!previousResponse}
              aria-label={t("responses.previous_response", "Previous response")}
              title={t("responses.previous_response", "Previous response")}
              onClick={() => setResponseId(previousResponse.id)}
            >
              <ChevronLeft
                size={14}
                strokeWidth={2}
                className={styles.flip}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              className={styles.stepBtn}
              disabled={!nextResponse}
              aria-label={t("responses.next_response", "Next response")}
              title={t("responses.next_response", "Next response")}
              onClick={() => setResponseId(nextResponse.id)}
            >
              <ChevronRight
                size={14}
                strokeWidth={2}
                className={styles.flip}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={() => setResponseToDelete(selected)}
            >
              {t("action_btn.delete")}
            </button>
          </div>
        </div>

        <dl className={styles.meta}>
          <MetaItem label={t("responses.ip_addr")} ltr>
            {selected.ipAddress || "—"}
          </MetaItem>
          <MetaItem label={t("label.surveyor")}>
            {selected.surveyorName ? renderSurveyorLink(selected) : "—"}
          </MetaItem>
          <MetaItem label={t("responses.start_date")} ltr>
            {formatDate(selected.startDate)}
          </MetaItem>
          <MetaItem label={t("responses.lang")}>
            {t(`language.${selected.lang}`) || "—"}
          </MetaItem>
          <MetaItem label={t("responses.submit_date")} ltr>
            {selected.submitDate ? formatDate(selected.submitDate) : "—"}
          </MetaItem>
          <MetaItem label={t("responses.disqualified")}>
            {selected.disqualified ? t("responses.yes") : t("responses.no")}
          </MetaItem>
          <MetaItem
            label={t("responses.voice_recordings")}
            wide={recordings.length > 0}
          >
            {renderVoiceRecordings(selected.events)}
          </MetaItem>
          <MetaItem label={t("responses.locations")}>
            {renderLocations(selected.events)}
          </MetaItem>
        </dl>

        <div
          role="tablist"
          aria-label={t("responses.title")}
          className={styles.tabs}
        >
          {[
            t("responses.answers", "Answers"),
            t("responses.events", "Events"),
          ].map((label, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={activeTab === index}
              onClick={() => setActiveTab(index)}
              className={`${styles.tab} ${
                activeTab === index ? styles.tabOn : ""
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 0 && renderAnswers()}
        {activeTab === 1 && (
          <ResponseEvents events={eventsData} loading={loadingEvents} />
        )}
      </article>
    );
  };

  return (
    <>
      <ResponsesExport
        open={exportDlgOpen}
        onClose={() => setExportDlgOpen(false)}
        onNoResponses={notifyNoResponses}
        currentFrom={responses.length > 0 ? responses[0].index : 1}
        currentTo={
          responses.length > 0 ? responses[responses.length - 1].index : 1
        }
        t={t}
      />

      <ResponsesDownload
        open={downloadDlgOpen}
        onClose={() => setDownloadDlgOpen(false)}
        onNoFiles={notifyNoFiles}
        onSizeLimit={notifyFilesSizeLimit}
        currentFrom={responses.length > 0 ? responses[0].index : 1}
        currentTo={
          responses.length > 0 ? responses[responses.length - 1].index : 1
        }
        t={t}
      />

      {renderExplorer()}

      <div className={styles.canvas}>
        {selected ? (
          renderResponse()
        ) : !fetching && responses.length === 0 ? (
          <div role="status" className={styles.notice}>
            <div className={styles.noticeTitle}>
              {t("responses.no_response_title", "No response to show")}
            </div>
            {t(
              "responses.no_response_hint",
              "Choose another type in Filter by type to see responses.",
            )}
          </div>
        ) : (
          <div role="status" className={styles.notice}>
            {t("responses.no_selection", "Select a response")}
          </div>
        )}
      </div>

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

      <Snackbar
        open={notice.open}
        autoHideDuration={4000}
        onClose={closeNotice}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={closeNotice}
          severity={notice.severity}
          sx={{ width: "100%" }}
        >
          {notice.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default React.memo(ResponsesList);
