import { createContext, useContext } from "react";

// True inside a snapshot preview. The preview store ignores edits and
// previewGuard blocks the input itself; this is for what should look different
// there: text that never opens TipTap, the inline code without its rename field,
// the left panel without the component palette.
export const DesignReadOnly = createContext(false);

export const useDesignReadOnly = () => useContext(DesignReadOnly);
