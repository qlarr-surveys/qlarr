import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useService } from "~/hooks/use-service";
import { onError } from "~/state/edit/editState";
import { SURVEY_STATUS } from "~/constants/survey";
import { serverDateTimeToLocalDateTime } from "~/utils/DateUtils";
import ConfirmActionModal from "~/components/common/ConfirmActionModal";
import { useDesignRestore } from "~/hooks/useDesignRestore";

function snapshotLabel(snapshot, t) {
  const { details } = snapshot;
  switch (snapshot.reason) {
    case "TIMER":
      return t("version_history.reason.timer");
    case "DELETE":
      return t("version_history.reason.delete", {
        codes: details.deleted.join(", "),
      });
    case "CHANGE_CODE":
      return t("version_history.reason.change_code", {
        from: details.from,
        to: details.to,
      });
    case "TRANSLATIONS_IMPORT":
      return t("version_history.reason.translations_import", {
        count: details.updated,
      });
    case "RESTORE":
      return details.publishedVersion
        ? t("version_history.reason.discard")
        : t("version_history.reason.restore");
    default:
      return snapshot.reason;
  }
}

function VersionHistory() {
  const { t, i18n } = useTranslation(NAMESPACES.MANAGE);
  const designService = useService("design");
  const dispatch = useDispatch();

  const versionDto = useSelector((state) => state.designState.versionDto);
  const { busy, restoring, restore } = useDesignRestore();
  const survey = useSelector((state) => state.editState.survey);
  const closed = survey?.status == SURVEY_STATUS.CLOSED;

  const [snapshots, setSnapshots] = useState(null);
  const [toRestore, setToRestore] = useState(null);

  // Any save, restore or publish changes the version — and the history with it.
  useEffect(() => {
    if (!versionDto) return;
    designService
      .listSnapshots()
      .then((data) => setSnapshots(data.snapshots))
      .catch((error) => {
        // handleRequest already dispatched the errors the app handles globally.
        if (!error?.handleGlobally) dispatch(onError(error));
      });
  }, [versionDto?.version, versionDto?.subVersion]);

  const restoreSnapshot = () =>
    restore(
      designService.restoreSnapshot(toRestore.id, versionDto.version)
    ).finally(() => setToRestore(null));

  const formatDate = (createdAt) =>
    serverDateTimeToLocalDateTime(createdAt).toLocaleString(i18n.language);

  return (
    <Box>
      <Typography variant="body2" color="text.secondary">
        {t("version_history.description")}
      </Typography>

      {snapshots === null ? (
        <Box sx={{ textAlign: "center", py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : snapshots.length === 0 ? (
        <Typography variant="body2" sx={{ mt: 2 }}>
          {t("version_history.empty")}
        </Typography>
      ) : (
        <List sx={{ mt: 1 }}>
          {snapshots.map((snapshot) => (
            <ListItem
              key={snapshot.id}
              divider
              disableGutters
              secondaryAction={
                !closed && (
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={busy || restoring}
                    onClick={() => setToRestore(snapshot)}
                  >
                    {t("version_history.restore")}
                  </Button>
                )
              }
            >
              <ListItemText
                sx={{ pr: 12 }}
                primary={snapshotLabel(snapshot, t)}
                secondary={[formatDate(snapshot.createdAt), snapshot.createdBy?.name]
                  .filter(Boolean)
                  .join(" · ")}
              />
            </ListItem>
          ))}
        </List>
      )}

      <ConfirmActionModal
        open={!!toRestore}
        title={t("version_history.restore_title")}
        description={
          toRestore &&
          t("version_history.restore_description", {
            date: formatDate(toRestore.createdAt),
          })
        }
        cancelLabel={t("action_btn.cancel")}
        confirmLabel={t("version_history.restore")}
        confirmColor="primary"
        isLoading={restoring}
        onClose={() => setToRestore(null)}
        onConfirm={restoreSnapshot}
      />
    </Box>
  );
}

export default React.memo(VersionHistory);
