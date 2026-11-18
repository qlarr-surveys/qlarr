import React from "react";
import { useDispatch } from "react-redux";
import { clearHighlighted } from "~/state/design/designState";

// Whether the advanced settings are showing is one choice for every
// question, remembered per browser: open them and every selection opens on
// them, close them and every selection opens on its general settings.
const OPEN_KEY = "design_show_advanced";

const readOpen = () => {
  try {
    return localStorage.getItem(OPEN_KEY) === "true";
  } catch {
    // Private windows and blocked site data throw on access.
    return false;
  }
};

const writeOpen = (value) => {
  try {
    localStorage.setItem(OPEN_KEY, String(value));
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

  const [view, setView] = React.useState(() => ({
    setupInfo: undefined,
    open: readOpen(),
    tab: undefined,
  }));

  // Recomputed while rendering, not in an effect, so a new selection never
  // paints one frame of the previous one's view.
  if (view.setupInfo !== setupInfo) {
    let next = { ...view, setupInfo };
    if (highlighted && !(basicRules.includes(highlighted) && !next.open)) {
      const tab = tabOf(tabs, highlighted);
      next = { ...next, open: true, tab: tab ? tab.key : next.tab };
    }
    setView(next);
  }

  React.useEffect(() => writeOpen(view.open), [view.open]);

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

  const currentTab = tabs.some((tab) => tab.key === view.tab)
    ? view.tab
    : tabs[0]?.key;

  return {
    open: view.open,
    setOpen,
    tab: currentTab,
    setTab,
    flash,
  };
}
