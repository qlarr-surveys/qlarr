/**
 * Role values as they appear in the JWT `authorities` claim (lowercased).
 */
export enum Role {
  SUPER_ADMIN = 'super_admin',
  SURVEY_ADMIN = 'survey_admin',
  SURVEYOR = 'surveyor',
  ANALYST = 'analyst',
}
