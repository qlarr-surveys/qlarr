import { useSelector } from "react-redux";

// A survey is considered "released" once it has been published at least once.
// Right after the first publish the engine marks version 1 as `published`; the
// first edit after that opens version 2, which is not published itself.
// Destructive edits (deleting components/options, changing codes) on a released
// survey can break already-collected responses, so callers use this to gate
// confirmations.
export function useIsReleased() {
  return useSelector((state) => {
    const versionDto = state.designState.versionDto;
    return !!versionDto?.published || (versionDto?.version ?? 0) > 1;
  });
}
