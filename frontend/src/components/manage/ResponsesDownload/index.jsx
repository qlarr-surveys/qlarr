import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from "@mui/material";
import { useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { saveAs } from "file-saver";
import FormProvider from "~/components/hook-form";
import { useParams } from "react-router-dom";
import { useService } from "~/hooks/use-service";
import { PROCESSED_ERRORS } from "~/utils/errorsProcessor";
import {
  ALL_STATUSES,
  RangeFields,
  StatusesField,
  rangeAndStatusesSchema,
  responseIndexBounds,
} from "~/components/manage/ResponsesFilterFields";

const DEFAULT_VALUES = {
  range: "all",
  statuses: ALL_STATUSES,
};

export async function downloadResponseFilesZip(
  surveyService,
  surveyId,
  { range, from, to, statuses } = DEFAULT_VALUES
) {
  const { blob, fileName } = await surveyService.downloadResponseFiles(
    surveyId,
    { ...responseIndexBounds({ range, from, to }), statuses }
  );
  if (!blob || blob.size === 0) return false;
  saveAs(new File([blob], fileName, { type: "application/zip" }));
  return true;
}

export default function ResponsesDownload({
  open,
  onClose,
  onNoFiles,
  onSizeLimit,
  t,
  currentFrom = 1,
  currentTo = 1,
}) {
  const { surveyId } = useParams();
  const surveyService = useService("survey");

  const [loading, setLoading] = useState(false);

  const methods = useForm({
    mode: "onChange",
    resolver: yupResolver(yup.object().shape(rangeAndStatusesSchema(t))),
    defaultValues: { ...DEFAULT_VALUES, from: currentFrom, to: currentTo },
  });

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = methods;
  const statuses = useWatch({ control, name: "statuses" });

  useEffect(() => {
    if (open) {
      reset({ ...DEFAULT_VALUES, from: currentFrom, to: currentTo });
    }
  }, [open, currentFrom, currentTo, reset]);

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    try {
      const downloaded = await downloadResponseFilesZip(
        surveyService,
        surveyId,
        data
      );
      if (!downloaded) {
        onNoFiles?.();
        return;
      }
      onClose?.();
    } catch (error) {
      if (error?.name === PROCESSED_ERRORS.SIZE_LIMIT_EXCEEDED.name) {
        onSizeLimit?.();
      }
    } finally {
      setLoading(false);
    }
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("responses.download")}</DialogTitle>

      <FormProvider methods={methods} onSubmit={onSubmit}>
        <DialogContent sx={{ display: "grid", gap: 2 }}>
          <RangeFields control={control} errors={errors} t={t} />
          <StatusesField control={control} t={t} />
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            {t("action_btn.cancel")}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !statuses?.length}
            endIcon={
              loading ? <CircularProgress size={20} color="inherit" /> : null
            }
          >
            {t("action_btn.download")}
          </Button>
        </DialogActions>
      </FormProvider>
    </Dialog>
  );
}
