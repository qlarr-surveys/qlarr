import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  IconButton,
  List,
  Slide,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowBack, Close, History } from "@mui/icons-material";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { isSessionRtl } from "~/utils/common";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useService } from "~/hooks/use-service";
import { useDesignRestore } from "~/hooks/useDesignRestore";
import { onError } from "~/state/edit/editState";
import { SURVEY_STATUS } from "~/constants/survey";
import { routes } from "~/routes";
import ConfirmActionModal from "~/components/common/ConfirmActionModal";
import {
  CURRENT_VERSION,
  SnapshotDesign,
  snapshotDate,
} from "~/components/manage/VersionHistory";

/** Browse the design's restore points: the list on the side, the selected one read-only. */
function DesignHistory() {
  const { t, i18n } = useTranslation(NAMESPACES.MANAGE);
  const designService = useService("design");
  const dispatch = useDispatch();
  const nav = useNavigate();
  const { surveyId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const versionDto = useSelector((state) => state.designState.versionDto);
  const survey = useSelector((state) => state.editState.survey);
  const closed = survey?.status == SURVEY_STATUS.CLOSED;
  // Something since the last publish to throw away, as on the Launch page.
  const canDiscard =
    !closed && !versionDto?.published && versionDto?.version > 1;
  const { busy, restoring, restore } = useDesignRestore();

  const [snapshots, setSnapshots] = useState(null);
  const [toRestore, setToRestore] = useState(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  // The version picked in the list, until it has loaded; then the list closes.
  const [loadingId, setLoadingId] = useState(null);
  // The version on screen; the selected one only once it has loaded.
  const [shownId, setShownId] = useState(null);
  const onSnapshotSettled = (id, loaded) => {
    if (loaded) setShownId(id);
    else if (shownId) setSearchParams({ snapshot: shownId }, { replace: true });
    if (id !== loadingId) return;
    setLoadingId(null);
    if (loaded) setListOpen(false);
  };
  const pageRef = useRef(null);
  // Re-render every minute so "5 minutes ago" stays true while the page is open.
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((tick) => tick + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    designService
      .listSnapshots()
      .then((data) => setSnapshots(data.snapshots))
      .catch((error) => {
        setSnapshots([]);
        if (!error?.handleGlobally) dispatch(onError(error));
      });
  }, []);

  const entries = snapshots && [{ id: CURRENT_VERSION }, ...snapshots];
  const selected =
    entries?.find((s) => s.id === searchParams.get("snapshot")) ?? entries?.[0];

  const formatDate = (savedAt) => snapshotDate(savedAt, i18n.language);
  const entryLabel = (entry) =>
    entry.id === CURRENT_VERSION
      ? t("version_history.current")
      : formatDate(entry.savedAt);
  const toDesign = () =>
    nav(routes.designSurvey.replace(":surveyId", surveyId));

  const restoreSnapshot = () =>
    restore(
      designService.restoreSnapshot(
        toRestore.id,
        versionDto.version,
        versionDto.subVersion,
      ),
    ).then((ok) => {
      setToRestore(null);
      if (ok) toDesign();
    });

  const discardChanges = () =>
    restore(
      designService.restorePublished(versionDto.version, versionDto.subVersion),
    ).then((ok) => {
      setDiscardOpen(false);
      if (ok) toDesign();
    });

  if (snapshots === null) {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box
      ref={pageRef}
      sx={{ position: "relative", height: "100%", overflow: "hidden" }}
    >
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1,
            py: 1,
            borderBottom: 1,
            borderColor: "divider",
            backgroundColor: "background.paper",
          }}
        >
          <CustomTooltip showIcon={false} title={t("goBack")}>
            <IconButton onClick={toDesign}>
              <ArrowBack
                sx={{ transform: isSessionRtl() ? "scaleX(-1)" : "none" }}
              />
            </IconButton>
          </CustomTooltip>
          <Typography sx={{ flex: 1 }} noWrap>
            {t("version_history.preview_title", {
              title: entryLabel(selected),
            })}
          </Typography>
          {selected.id !== CURRENT_VERSION && !closed && (
            <Button
              variant="contained"
              color="error"
              disabled={busy || restoring || selected.id !== shownId}
              onClick={() => setToRestore(selected)}
            >
              {t("version_history.restore")}
            </Button>
          )}
          <CustomTooltip
            showIcon={false}
            title={t("edit_survey.version_history")}
          >
            <IconButton
              color={listOpen ? "primary" : "default"}
              onClick={() => setListOpen((open) => !open)}
            >
              <History />
            </IconButton>
          </CustomTooltip>
        </Box>
        <LinearProgress
          sx={{ height: 2, visibility: loadingId ? "visible" : "hidden" }}
        />
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <SnapshotDesign
            snapshotId={selected.id}
            shownId={shownId}
            onSettled={onSnapshotSettled}
          />
        </Box>
      </Box>

      <Slide
        in={listOpen}
        direction={isSessionRtl() ? "right" : "left"}
        container={pageRef.current}
        mountOnEnter
        unmountOnExit
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            bottom: 0,
            insetInlineEnd: 0,
            zIndex: 20, // above the designer's search box (z-index 10)
            width: 340,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "background.paper",
            boxShadow: 8,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", px: 2, pt: 1.5 }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              {t("edit_survey.version_history")}
            </Typography>
            <IconButton size="small" onClick={() => setListOpen(false)}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ px: 2, pb: 1 }}
          >
            {t("version_history.description")}
          </Typography>
          <List disablePadding sx={{ flex: 1, overflowY: "auto" }}>
            {entries.map((entry) => (
              <ListItemButton
                key={entry.id}
                divider
                selected={entry.id === selected.id}
                onClick={() => {
                  if (entry.id === selected.id) {
                    setListOpen(false);
                    return;
                  }
                  setLoadingId(entry.id);
                  setSearchParams({ snapshot: entry.id });
                }}
              >
                <ListItemText
                  primary={entryLabel(entry)}
                  secondary={
                    entry.id === CURRENT_VERSION
                      ? versionDto?.lastModified &&
                        formatDate(versionDto.lastModified)
                      : entry.createdBy?.name
                  }
                />
                {entry.id === loadingId && <CircularProgress size={18} />}
              </ListItemButton>
            ))}
            {snapshots.length === 0 && (
              <Typography sx={{ p: 2 }} color="text.secondary">
                {t("version_history.empty")}
              </Typography>
            )}
          </List>
          {canDiscard && (
            <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                disabled={busy || restoring}
                onClick={() => setDiscardOpen(true)}
              >
                {t("launch.discard_changes")}
              </Button>
            </Box>
          )}
        </Box>
      </Slide>

      <ConfirmActionModal
        open={!!toRestore}
        title={t("version_history.restore_title")}
        description={
          toRestore &&
          t("version_history.restore_description", {
            date: formatDate(toRestore.savedAt),
          })
        }
        cancelLabel={t("action_btn.cancel")}
        confirmLabel={t("version_history.restore")}
        requireAcknowledgement
        acknowledgementLabel={t("version_history.restore_acknowledge")}
        isLoading={restoring}
        onClose={() => setToRestore(null)}
        onConfirm={restoreSnapshot}
      />
      <ConfirmActionModal
        open={discardOpen}
        title={t("launch.discard_title")}
        description={t("launch.discard_description")}
        cancelLabel={t("action_btn.cancel")}
        confirmLabel={t("launch.discard_changes")}
        requireAcknowledgement
        acknowledgementLabel={t("version_history.restore_acknowledge")}
        isLoading={restoring}
        onClose={() => setDiscardOpen(false)}
        onConfirm={discardChanges}
      />
    </Box>
  );
}

export default React.memo(DesignHistory);
