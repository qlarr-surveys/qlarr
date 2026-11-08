import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert } from "@mui/material";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useService } from "~/hooks/use-service";
import { hasComputeAtStake } from "~/utils/computeJobs";

/**
 * While the survey has a Compute in progress or computed results, warns that
 * editing the design loses them. Checked on open and after every save.
 */
function ComputeBanner() {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const surveyService = useService("survey");
  const { surveyId } = useParams();
  const lastSave = useSelector((state) => state.editState.lastSave);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let current = true;
    surveyService
      .getJobs(surveyId)
      .then((jobs) => current && setShow(hasComputeAtStake(jobs)))
      .catch(() => current && setShow(false));
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId, lastSave]);

  if (!show) return null;
  return (
    <Alert severity="warning" sx={{ borderRadius: 0 }}>
      {t(
        "calculations.design_banner",
        "Editing the design cancels running computations and deletes computed results."
      )}
    </Alert>
  );
}

export default React.memo(ComputeBanner);
