import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ChartColumn,
  ClipboardList,
  Languages,
  Palette,
  SlidersHorizontal,
} from "lucide-react";
import { MANAGE_SURVEY_LANDING_PAGES, routes } from "~/routes";
import { DESIGN_SURVEY_MODE } from "@qlarr/design-core/constants/designMode";
import {
  setDesignModeToDesign,
  setDesignModeToLang,
  setDesignModeToTheme,
} from "~/state/design/designState";

/**
 * The five workspaces of the survey editor, as descriptors for the tab strip.
 *
 * Three of them — Builder, Theme and Translation — are the same URL
 * (`/design-survey/:surveyId`) and differ only by the `designMode` they
 * dispatch, which is why selection has to be read from two places: the
 * route-level `selectedPage` and the redux `designMode`. The other two are
 * ordinary navigations to sibling routes.
 *
 * Returns `[]` when the user's role grants no pages at all, so the caller can
 * render nothing rather than an empty strip.
 */
export default function useWorkspaceTabs({
  availablePages,
  selectedPage,
  surveyId,
  onPageChange,
}) {
  const dispatch = useDispatch();

  const designMode = useSelector((state) => state.designState.designMode);

  const published = useSelector(
    (state) => state.designState.versionDto?.published
  );

  // The Survey-level "random" rule opens its own panel, and while it is open the
  // Builder tab is not the thing being edited — so it stops claiming selection.
  const orderPriorityActive = useSelector((state) => {
    const setupState = state.designState.setup;
    return (
      state.designState.designMode === DESIGN_SURVEY_MODE.DESIGN &&
      setupState?.code === "Survey" &&
      !!setupState?.rules?.some((rule) => rule.key === "random")
    );
  });

  return useMemo(() => {
    const tabAvailable = (page) => availablePages.indexOf(page) !== -1;
    const inDesignPage = selectedPage === MANAGE_SURVEY_LANDING_PAGES.DESIGN;

    const designTab = (key, labelKey, icon, mode, action, dataTour) => ({
      key,
      labelKey,
      icon,
      dataTour,
      to: routes.designSurvey.replace(":surveyId", surveyId),
      selected: inDesignPage && designMode === mode && !orderPriorityActive,
      onSelect: () => {
        onPageChange(MANAGE_SURVEY_LANDING_PAGES.DESIGN);
        dispatch(action());
      },
    });

    const tabs = [];

    if (tabAvailable(MANAGE_SURVEY_LANDING_PAGES.DESIGN)) {
      tabs.push(
        designTab(
          "builder",
          "design",
          ClipboardList,
          DESIGN_SURVEY_MODE.DESIGN,
          setDesignModeToDesign
        ),
        designTab(
          "theme",
          "theme",
          Palette,
          DESIGN_SURVEY_MODE.THEME,
          setDesignModeToTheme,
          "side-tab-theme"
        ),
        designTab(
          "lang",
          "translation",
          Languages,
          DESIGN_SURVEY_MODE.LANGUAGES,
          setDesignModeToLang,
          "side-tab-translation"
        )
      );
    }

    if (tabAvailable(MANAGE_SURVEY_LANDING_PAGES.SETTINGS)) {
      tabs.push({
        key: "cfg",
        labelKey: "settings",
        icon: SlidersHorizontal,
        dataTour: "side-tab-settings",
        to: routes.editSurvey.replace(":surveyId", surveyId),
        selected: selectedPage === MANAGE_SURVEY_LANDING_PAGES.SETTINGS,
        // The survey has edits that respondents cannot see yet; publishing lives
        // in this workspace, so the dot belongs on its tab.
        badge: !published,
        onSelect: () =>
          onPageChange(MANAGE_SURVEY_LANDING_PAGES.SETTINGS),
      });
    }

    if (tabAvailable(MANAGE_SURVEY_LANDING_PAGES.RESPONSES)) {
      tabs.push({
        key: "res",
        labelKey: "responses",
        icon: ChartColumn,
        dataTour: "side-tab-responses",
        to: routes.responses.replace(":surveyId", surveyId),
        selected: selectedPage === MANAGE_SURVEY_LANDING_PAGES.RESPONSES,
        onSelect: () =>
          onPageChange(MANAGE_SURVEY_LANDING_PAGES.RESPONSES),
      });
    }

    return tabs;
  }, [
    availablePages,
    selectedPage,
    surveyId,
    onPageChange,
    designMode,
    published,
    orderPriorityActive,
    dispatch,
  ]);
}
