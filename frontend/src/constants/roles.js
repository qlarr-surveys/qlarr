import { MANAGE_SURVEY_LANDING_PAGES } from '~/routes';
import TokenService from "~/services/TokenService";

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  SURVEY_ADMIN: "survey_admin",
  SURVEYOR: "surveyor",
  ANALYST: "analyst",
};

export const isSurveyAdmin = () => {
  const roles = TokenService.getUser().roles;
  return (
    roles.indexOf(ROLES.SUPER_ADMIN) != -1 ||
    roles.indexOf(ROLES.SURVEY_ADMIN) != -1
  );
};

export const availablePages = (user) => {
  if (isSurveyAdmin(user)) {
    return [
      MANAGE_SURVEY_LANDING_PAGES.DESIGN,
      MANAGE_SURVEY_LANDING_PAGES.SETTINGS,
      MANAGE_SURVEY_LANDING_PAGES.RESPONSES,
    ];
  } else if (isAnalyst(user)) {
    return [
      MANAGE_SURVEY_LANDING_PAGES.RESPONSES,
    ];
  } else {
    return [];
  }
};

export const isSuperAdmin = () => {
  const roles = TokenService.getUser().roles;
  return (
    roles.indexOf(ROLES.SUPER_ADMIN) != -1
  );
};

export const isUserAnalyst = () => {
  const roles = TokenService.getUser().roles;
  return (
    roles.indexOf(ROLES.SUPER_ADMIN) != -1 || roles.indexOf(ROLES.ANALYST) != -1 || roles.indexOf(ROLES.SURVEY_ADMIN) != -1
  );
};

export const isSurveyor = (user) => {
  const roles = user.roles;
  return (
    roles.indexOf(ROLES.SUPER_ADMIN) != -1 ||
    roles.indexOf(ROLES.SURVEYOR) != -1
  );
};

export const isAnalyst = (user) => {
  const roles = user.roles;
  return (
    roles.indexOf(ROLES.SUPER_ADMIN) != -1 || roles.indexOf(ROLES.ANALYST) != -1 || roles.indexOf(ROLES.SURVEY_ADMIN) != -1
  );
};

export const isSurveyorOnly = () => {
  const roles = TokenService.getUser().roles;
  return roles.length == 1 && roles.indexOf(ROLES.SURVEYOR) != -1;
};
