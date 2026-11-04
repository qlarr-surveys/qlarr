import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { designStateReceived } from "~/state/design/designState";
import { onError } from "~/state/edit/editState";

export function useDesignRestore() {
  const dispatch = useDispatch();
  const busy = useSelector(
    (state) => state.designState.isSaving || state.designState.isUpdating
  );
  const [restoring, setRestoring] = useState(false);

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

  return { busy, restoring, restore };
}
