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
import SnapshotDesign from "~/components/manage/VersionHistory/SnapshotDesign";
import { snapshotDate } from "~/components/manage/VersionHistory/snapshotFormat";

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
  const { busy, restoring, restore } = useDesignRestore();

  const [snapshots, setSnapshots] = useState(null);
  const [toRestore, setToRestore] = useState(null);
  const [listOpen, setListOpen] = useState(true);
  // The version picked in the list, until it has loaded; then the list closes.
  const [loadingId, setLoadingId] = useState(null);
  const onSnapshotSettled = (id, loaded) => {
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

  const selected =
    snapshots?.find((s) => s.id === searchParams.get("snapshot")) ??
    snapshots?.[0];

  const formatDate = (savedAt) => snapshotDate(savedAt, i18n.language);
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
            {selected &&
              t("version_history.preview_title", {
                title: formatDate(selected.savedAt),
              })}
          </Typography>
          {selected && !closed && (
            <Button
              variant="contained"
              color="error"
              disabled={busy || restoring}
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
        {selected ? (
          <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <SnapshotDesign
              snapshotId={selected.id}
              onSettled={onSnapshotSettled}
            />
          </Box>
        ) : (
          <Typography sx={{ p: 4 }} color="text.secondary">
            {t("version_history.empty")}
          </Typography>
        )}
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
            overflowY: "auto",
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
          <List disablePadding>
            {snapshots.map((snapshot) => (
              <ListItemButton
                key={snapshot.id}
                divider
                selected={snapshot.id === selected?.id}
                onClick={() => {
                  if (snapshot.id === selected?.id) {
                    setListOpen(false);
                    return;
                  }
                  setLoadingId(snapshot.id);
                  setSearchParams({ snapshot: snapshot.id });
                }}
              >
                <ListItemText
                  primary={formatDate(snapshot.savedAt)}
                  secondary={snapshot.createdBy?.name}
                />
                {snapshot.id === loadingId && <CircularProgress size={18} />}
              </ListItemButton>
            ))}
          </List>
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
    </Box>
  );
}

export default React.memo(DesignHistory);
