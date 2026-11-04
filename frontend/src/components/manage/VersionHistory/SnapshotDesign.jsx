import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { Provider, useDispatch, useSelector } from "react-redux";
import { useService } from "~/hooks/use-service";
import { changeLang } from "~/state/design/designState";
import { onError } from "~/state/edit/editState";
import { createPreviewStore, loadPreview } from "~/store";
import { DesignReadOnly } from "~/components/design/DesignReadOnly";
import LoadingDots from "~/components/common/LoadingDots";
import { guardPreview } from "./previewGuard";
import { CURRENT_VERSION } from "./snapshotFormat";

const DesignSurvey = React.lazy(() => import("~/pages/DesignSurvey"));

/** Switches the language shown; sits outside the guard, which blocks controls. */
function PreviewLanguage() {
  const dispatch = useDispatch();
  const langInfo = useSelector((state) => state.designState.langInfo);
  if (!(langInfo?.languagesList?.length > 1)) return null;
  return (
    <Box
      sx={{
        px: 2,
        py: 1,
        borderBottom: 1,
        borderColor: "divider",
        backgroundColor: "background.paper",
      }}
    >
      <ToggleButtonGroup
        size="small"
        exclusive
        value={langInfo.lang}
        onChange={(_, lang) => {
          if (lang !== null) dispatch(changeLang(lang));
        }}
        aria-label="preview language"
      >
        {langInfo.languagesList.map((language) => (
          <ToggleButton key={language.code} value={language.code}>
            {language.name}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}

/**
 * The designer on a snapshot or the current version, read-only. One store serves every snapshot shown,
 * so switching versions swaps the content without remounting the designer.
 */
function SnapshotDesign({ snapshotId, shownId, onSettled }) {
  const designService = useService("design");
  const dispatch = useDispatch();
  const survey = useSelector((state) => state.editState.survey);
  const versionDto = useSelector((state) => state.designState.versionDto);
  const [store] = useState(() => createPreviewStore(survey));
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const unguard = useRef(null);
  const guardRef = useCallback((node) => {
    unguard.current?.();
    unguard.current = node ? guardPreview(node) : null;
  }, []);

  useEffect(() => {
    // Already on screen: back from a failed load, or re-picked before one ended.
    if (snapshotId === shownId) {
      onSettled?.(snapshotId, true);
      return;
    }
    setFailed(false);
    // Ignore a slow response once another version has been picked.
    let current = true;
    const request =
      snapshotId === CURRENT_VERSION
        ? designService.getSurveyDesign()
        : designService.getSnapshot(snapshotId);
    request
      .then((data) => {
        if (!current) return;
        const lang = store.getState().designState.langInfo?.lang;
        store.dispatch(loadPreview({ ...data, versionDto, overWriteLang: true }));
        // Stay on the language being viewed if this version has it too.
        const { languagesList } = store.getState().designState.langInfo;
        if (languagesList.some((language) => language.code === lang)) {
          store.dispatch(changeLang(lang));
        }
        setLoaded(true);
        onSettled?.(snapshotId, true);
      })
      .catch((error) => {
        if (!current) return;
        if (!error?.handleGlobally) dispatch(onError(error));
        setFailed(true);
        onSettled?.(snapshotId, false);
      });
    return () => {
      current = false;
    };
  }, [snapshotId]);

  if (!loaded) return failed ? null : <LoadingDots fullHeight />;
  return (
    <Provider store={store}>
      <DesignReadOnly.Provider value={true}>
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <PreviewLanguage />
          <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <div ref={guardRef} style={{ display: "contents" }}>
              <Suspense fallback={<LoadingDots fullHeight />}>
                <DesignSurvey />
              </Suspense>
            </div>
          </Box>
        </Box>
      </DesignReadOnly.Provider>
    </Provider>
  );
}

export default React.memo(SnapshotDesign);
