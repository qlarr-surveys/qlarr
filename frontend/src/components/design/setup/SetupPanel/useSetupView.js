import React from "react";
import { useDispatch } from "react-redux";
import { clearHighlighted } from "~/state/design/designState";

// "Always expand" (the advanced settings open for every question you select)
// is remembered per browser. It keeps the key the old panel stored "show
// advanced settings" under, so whoever left them showing there still finds
// them open.
const ALWAYS_EXPAND_KEY = "design_show_advanced";

const readAlwaysExpand = () => {
  try {
    return localStorage.getItem(ALWAYS_EXPAND_KEY) === "true";
  } catch {
    // Private windows and blocked site data throw on access.
    return false;
  }
};

const writeAlwaysExpand = (value) => {
  try {
    localStorage.setItem(ALWAYS_EXPAND_KEY, String(value));
  } catch {
    // Kept for this session either way.
  }
};

// How long a highlighted row stays tinted before the highlight is cleared.
const FLASH_MS = 2000;

const tabOf = (tabs, rule) =>
  tabs.find((tab) => tab.key === rule || tab.rules?.includes(rule));

/**
 * What the settings panel shows for the current selection: whether the
 * advanced settings are open, which tab they are on, and which row is
 * flashing because something on the canvas pointed at it.
 *
 * A highlight is a tab key ("validation") or a rule ("disabled"). A rule the
 * general settings show is flashed there while they are what is showing;
 * anything else opens the advanced settings on the tab that holds it.
 */
export function useSetupView({ setupInfo, tabs, basicRules }) {
  const dispatch = useDispatch();
  const code = setupInfo?.code;
  const highlighted = setupInfo?.highlighted;

  const [alwaysExpand, setAlwaysExpandState] = React.useState(readAlwaysExpand);
  const [view, setView] = React.useState({
    setupInfo: undefined,
    code: undefined,
    rules: undefined,
    open: false,
    tab: undefined,
  });

  // Recomputed while rendering, not in an effect, so a new selection never
  // paints one frame of the previous one's view.
  if (view.setupInfo !== setupInfo) {
    let next = { ...view, setupInfo };
    // A code change that keeps the rules is the selection being renamed
    // (the element code editor re-points the setup), not a new selection.
    if (view.code !== code && view.rules !== setupInfo?.rules) {
      next = { ...next, open: alwaysExpand };
    }
    next = { ...next, code, rules: setupInfo?.rules };
    if (highlighted && !(basicRules.includes(highlighted) && !next.open)) {
      const tab = tabOf(tabs, highlighted);
      next = { ...next, open: true, tab: tab ? tab.key : next.tab };
    }
    setView(next);
  }

  const [flash, setFlash] = React.useState(null);

  React.useEffect(() => {
    if (!highlighted) {
      setFlash(null);
      return undefined;
    }
    setFlash(highlighted);
    const timer = setTimeout(() => {
      setFlash(null);
      dispatch(clearHighlighted());
    }, FLASH_MS);
    return () => clearTimeout(timer);
  }, [highlighted, code, dispatch]);

  const setOpen = React.useCallback(
    (open) => setView((current) => ({ ...current, open })),
    []
  );

  const setTab = React.useCallback(
    (tab) => setView((current) => ({ ...current, tab })),
    []
  );

  const setAlwaysExpand = React.useCallback((value) => {
    writeAlwaysExpand(value);
    setAlwaysExpandState(value);
    // Choosing "Always expand" opens them now too; going back to "on demand"
    // leaves the current selection as it is.
    if (value) {
      setView((current) => ({ ...current, open: true }));
    }
  }, []);

  const currentTab = tabs.some((tab) => tab.key === view.tab)
    ? view.tab
    : tabs[0]?.key;

  return {
    open: view.open,
    setOpen,
    tab: currentTab,
    setTab,
    flash,
    alwaysExpand,
    setAlwaysExpand,
  };
}
