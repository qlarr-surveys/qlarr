import { useDispatch } from "react-redux";
import { useService } from "~/hooks/use-service";
import { onError } from "~/state/edit/editState";
import { PROCESSED_ERRORS } from "~/utils/errorsProcessor";
import { MAX_RESOURCE_UPLOAD_BYTES } from "~/constants/networking";

/**
 * Upload a survey resource from the design editor. Rejects files over the
 * backend's cap before sending, and reports failures in the editor's error
 * dialog. Resolves to the upload response, or null if it failed (callers
 * should still clear their own loading state).
 */
export function useResourceUpload() {
  const dispatch = useDispatch();
  const designService = useService("design");

  return async (file, { onProgress } = {}) => {
    if (!file) return null;
    if (file.size > MAX_RESOURCE_UPLOAD_BYTES) {
      dispatch(onError(PROCESSED_ERRORS.MAX_UPLOAD_SIZE_EXCEEDED));
      return null;
    }
    try {
      return await designService.uploadResource(file, null, onProgress);
    } catch (err) {
      console.error(err);
      // Globally-handled errors are already dispatched by BaseService.
      if (err && !err.handleGlobally) {
        dispatch(onError(err));
      }
      return null;
    }
  };
}
