import React, { Suspense, useEffect, useState } from "react";
import { Provider, useDispatch, useSelector } from "react-redux";
import { useService } from "~/hooks/use-service";
import { onError } from "~/state/edit/editState";
import { createPreviewStore, loadPreview } from "~/store";
import { DesignReadOnly } from "~/components/design/DesignReadOnly";
import LoadingDots from "~/components/common/LoadingDots";

const DesignSurvey = React.lazy(() => import("~/pages/DesignSurvey"));

/**
 * The designer on a snapshot, read-only. One store serves every snapshot shown,
 * so switching versions swaps the content without remounting the designer.
 */
function SnapshotDesign({ snapshotId, onSettled }) {
  const designService = useService("design");
  const dispatch = useDispatch();
  const survey = useSelector((state) => state.editState.survey);
  const versionDto = useSelector((state) => state.designState.versionDto);
  const [store] = useState(() => createPreviewStore(survey));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Ignore a slow response once another version has been picked.
    let current = true;
    designService
      .getSnapshot(snapshotId)
      .then((data) => {
        if (!current) return;
        store.dispatch(loadPreview({ ...data, versionDto }));
        setLoaded(true);
        onSettled?.(snapshotId, true);
      })
      .catch((error) => {
        if (!current) return;
        if (!error?.handleGlobally) dispatch(onError(error));
        onSettled?.(snapshotId, false);
      });
    return () => {
      current = false;
    };
  }, [snapshotId]);

  if (!loaded) return <LoadingDots fullHeight />;
  return (
    <Provider store={store}>
      <DesignReadOnly.Provider value={true}>
        <Suspense fallback={<LoadingDots fullHeight />}>
          <DesignSurvey />
        </Suspense>
      </DesignReadOnly.Provider>
    </Provider>
  );
}

export default React.memo(SnapshotDesign);
