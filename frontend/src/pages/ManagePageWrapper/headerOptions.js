export const HEADER_OPTIONS = {
  NONE: {showHeader: false, showSurveyHeader: false, showPreview: false, showUserMenu: false},
  AUTH: {showHeader: true, showSurveyHeader: false, showPreview: false, showUserMenu: false},
  GENERAL: {showHeader: true, showSurveyHeader: false, showPreview: false, showUserMenu: true},
  DASHBOARD: {showHeader: true, showSurveyHeader: false, showPreview: false, showUserMenu: true, titleKey: "my_surveys"},
  SURVEY: {showHeader: true, showSurveyHeader: true, showPreview: true, showUserMenu: true},
  SURVEY_NO_PREVIEW: {showHeader: true, showSurveyHeader: true, showPreview: false, showUserMenu: true},
};
