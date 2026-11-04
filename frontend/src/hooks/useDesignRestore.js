import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { designStateReceived } from "~/state/design/designState";
import { onError } from "~/state/edit/editState";
import { useService } from "~/hooks/use-service";
import { isSurveyAdmin } from "~/constants/roles";
import { SURVEY_STATUS } from "~/constants/survey";

export function useDesignRestore() {
  const dispatch = useDispatch();
  const designService = useService("design");
  const versionDto = useSelector((state) => state.designState.versionDto);
  const survey = useSelector((state) => state.editState.survey);
  const busy = useSelector(
    (state) => state.designState.isSaving || state.designState.isUpdating
  );
  const [restoring, setRestoring] = useState(false);
  // Something since the last publish to throw away.
  const canDiscard =
    isSurveyAdmin() &&
    survey?.status != SURVEY_STATUS.CLOSED &&
    !versionDto?.published &&
    versionDto?.version > 1;

  /** Resolves to whether the restore succeeded. */
  const restore = (request) => {
    setRestoring(true);
    return request
      .then((data) => {
        dispatch(designStateReceived({ ...data, overWriteLang: true }));
        return true;
      })
      .catch((error) => {
        if (!error?.handleGlobally) dispatch(onError(error));
        return false;
      })
      .finally(() => setRestoring(false));
  };

  const discard = () =>
    restore(
      designService.restorePublished(versionDto?.version, versionDto?.subVersion)
    );

  return { busy, restoring, restore, canDiscard, discard };
}
