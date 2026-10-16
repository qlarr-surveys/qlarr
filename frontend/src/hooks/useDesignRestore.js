import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { designStateReceived } from "~/state/design/designState";
import { onError } from "~/state/edit/editState";

// Shared by the version-history restore and "discard unpublished changes": both
// replace the draft with a design from the server. `restore` takes the request,
// loads the returned design into the editor and reports errors; its promise
// always resolves, so callers can close their dialog in `.finally`.
export function useDesignRestore() {
  const dispatch = useDispatch();
  // An autosave in flight would race the restore, so callers disable on it.
  const busy = useSelector(
    (state) => state.designState.isSaving || state.designState.isUpdating
  );
  const [restoring, setRestoring] = useState(false);

  const restore = (request) => {
    setRestoring(true);
    return request
      .then((data) => {
        dispatch(designStateReceived({ ...data, overWriteLang: true }));
      })
      .catch((error) => {
        // handleRequest already dispatched the errors the app handles globally.
        if (!error?.handleGlobally) dispatch(onError(error));
      })
      .finally(() => setRestoring(false));
  };

  return { busy, restoring, restore };
}
