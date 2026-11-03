import { useDispatch } from "react-redux";
import { useService } from "~/hooks/use-service";
import { onError } from "~/state/edit/editState";
import { PROCESSED_ERRORS } from "~/utils/errorsProcessor";
import { MAX_RESOURCE_UPLOAD_BYTES } from "~/constants/networking";

/**
 * Upload a survey resource. Rejects files over the backend's cap before
 * sending, and reports failures in the editor's error dialog. Resolves to the
 * upload response, or null if it failed (callers should still clear their own
 * loading state).
 *
 * `surveyId` names the survey to upload to. Omit it inside the design editor,
 * where the service falls back to `sessionStorage.surveyId`; the dashboard has
 * to pass it, because it never sets that key.
 *
 * Pass `onFailure` to handle errors locally instead of in the editor's global
 * error dialog, which the dashboard has no place to show.
 */
export function useResourceUpload() {
  const dispatch = useDispatch();
  const designService = useService("design");

  return async (file, { onProgress, surveyId = null, onFailure } = {}) => {
    const fail = (processedError) => {
      if (onFailure) {
        onFailure(processedError);
      } else {
        dispatch(onError(processedError));
      }
      return null;
    };

    if (!file) return null;
    if (file.size > MAX_RESOURCE_UPLOAD_BYTES) {
      return fail(PROCESSED_ERRORS.MAX_UPLOAD_SIZE_EXCEEDED);
    }
    try {
      return await designService.uploadResource(file, surveyId, onProgress);
    } catch (err) {
      console.error(err);
      // Globally-handled errors are already dispatched by BaseService, but a
      // local handler still wants to hear about them.
      if (err && (onFailure || !err.handleGlobally)) {
        return fail(err);
      }
      return null;
    }
  };
}
