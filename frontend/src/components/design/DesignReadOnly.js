import { createContext, useContext } from "react";

// True inside a snapshot preview. The preview store already ignores every
// action; this covers what keeps its own state (TipTap) or calls the API
// directly (inline code rename, autocomplete uploads).
export const DesignReadOnly = createContext(false);

export const useDesignReadOnly = () => useContext(DesignReadOnly);
