import { useSelector } from "react-redux";

// A survey is considered "released" once it has been published at least once,
// which the engine signals by bumping the design version past 1. Destructive
// edits (deleting components/options, changing codes) on a released survey can
// break already-collected responses, so callers use this to gate confirmations.
export function useIsReleased() {
  return useSelector((state) => (state.designState.versionDto?.version ?? 0) > 1);
}
