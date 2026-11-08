// showSaveState: the header says whether the survey is saved, which is only
// meaningful where edits are saved as they are made — the design editor and
// the settings form. The responses workspace writes nothing.
export const HEADER_OPTIONS = {
  NONE: {showHeader: false, showSurveyHeader: false, showPreview: false, showUserMenu: false, showSaveState: false},
  AUTH: {showHeader: true, showSurveyHeader: false, showPreview: false, showUserMenu: false, showSaveState: false},
  GENERAL: {showHeader: true, showSurveyHeader: false, showPreview: false, showUserMenu: true, showSaveState: false},
  SURVEY: {showHeader: true, showSurveyHeader: true, showPreview: true, showUserMenu: true, showSaveState: true},
  SURVEY_NO_PREVIEW: {showHeader: true, showSurveyHeader: true, showPreview: false, showUserMenu: true, showSaveState: false},
};
