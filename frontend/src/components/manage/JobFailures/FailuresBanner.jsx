import React from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Stack } from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

/**
 * The responses a job subject failed on, with Retry and View failures. Shown
 * whenever there are any, whatever the last run's status; Retry waits while a
 * job is queued or running. `doneLabel` is the kind's own word for a finished
 * run ("Computed."), shown when the last run completed with failures.
 */
function FailuresBanner({ state, doneLabel, onRetry, retrying, retryDisabled, onView }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const count = state.failedCount;
  return (
    <Alert
      severity="warning"
      action={
        <Stack direction="row" spacing={1}>
          <Button color="inherit" size="small" onClick={onView}>
            {t("jobs.view_failures", "View failures")}
          </Button>
          <LoadingButton
            color="inherit"
            size="small"
            onClick={onRetry}
            loading={retrying}
            disabled={retryDisabled}
          >
            {t("action_btn.retry", "Retry")}
          </LoadingButton>
        </Stack>
      }
    >
      {state.status === "completed_with_failures"
        ? t(
            "jobs.status_completed_with_failures",
            "{{done}} {{count}} responses failed.",
            { done: doneLabel, count }
          )
        : t("jobs.status_failures", "{{count}} responses failed.", { count })}
    </Alert>
  );
}

export default React.memo(FailuresBanner);
