export const PROCESSED_ERRORS = {
  NETWORK_ERR: { name: "network_err", handleGlobally: true },
  BACKEND_DOWN: { name: "backend_down", handleGlobally: true },
  WRONG_CONFIRMATION_TOKEN: {
    name: "wrong_confirmation_token",
    handleGlobally: false,
  },
  EXPIRED_CONFIRMATION_TOKEN: {
    name: "expired_confirmation_token",
    handleGlobally: false,
  },

  UNIDENTIFIED_ERROR: { name: "unidentified_error", handleGlobally: true },
  SURVEY_CLOSED: { name: "survey_closed", handleGlobally: false },
  WRONG_RESET_TOKEN: { name: "wrong_reset_token", handleGlobally: false },
  COMPONENT_DELETED: { name: "component_deleted", handleGlobally: false },
  CODE_CHANGED_AFTER_PUBLISH: { name: "code_changed_after_publish", handleGlobally: false },
  DESIGN_OUT_OF_SYNC: { name: "design_out_of_sync", handleGlobally: false },
  WRONG_CREDENTIALS: { name: "wrong_credentials", handleGlobally: false },
  WRONG_PIN: { name: "code_invalid", handleGlobally: false },
  DESIGN_NOT_AVAILABLE_EXCEPTION: {
    name: "invalid_file_for_survey_export",
    handleGlobally: false,
  },
  DUPLICATE_EMAIL: { name: "duplicate_email", handleGlobally: false },
  AUTOCOMPLETE_MALFORMED_INPUT: {
    name: "autocomplete_malformed_input",
    handleGlobally: false,
  },
  MAX_UPLOAD_SIZE_EXCEEDED: {
    name: "max_upload_size_exceeded",
    handleGlobally: false,
  },
  SIZE_LIMIT_EXCEEDED: {
    name: "size_limit_exceeded",
    handleGlobally: false,
  },
  DUPLICATE_SURVEY_NAME: {
    name: "duplicate_survey_name",
    handleGlobally: false,
  },
  EXPIRED_RESET_TOKEN: { name: "expired_reset_token", handleGlobally: false },

  USED_CONFIRMATION_TOKEN: {
    name: "used_confirmation_token",
    handleGlobally: false,
  },
  USER_NOT_FOUND: { name: "user_not_found", handleGlobally: false },
  MISSING_CREDENTIALS: { name: "missing_credentials", handleGlobally: false },
  SURVEY_DESIGN_ERROR: { name: "survey_design_error", handleGlobally: false },
  SURVEY_NOT_ACTIVE: { name: "survey_not_active", handleGlobally: false },

  SURVEY_SCHEDULED: { name: "survey_scheduled", handleGlobally: false },
  SURVEY_EXPIRED: { name: "survey_expired", handleGlobally: false },
  INVALID_SURVEY_DATES: { name: "invalid_survey_dates", handleGlobally: false },
  SURVEY_QUOTA: { name: "survey_quota", handleGlobally: false },
  DUPLICATE_TO_CODE: { name: "duplicate_to_code", handleGlobally: false },
};

export const onApiError = ({
  error,
  globalErrorHandler = (error) => {},
  locallErrorHandler = (error) => {},
}) => {
  const processed = !error
    ? PROCESSED_ERRORS.UNIDENTIFIED_ERROR
    : processError(error);
  if (processed && processed.handleGlobally) {
    globalErrorHandler(processed);
  } else if (processed) {
    locallErrorHandler(processed);
  }
  return processed;
};

export const processApiError = async ({
  error,
  globalErrorHandler = (processed) => {},
}) => {
  // Convert blob errors to JSON for proper error processing
  if (
    error?.response?.data instanceof Blob &&
    error.response.data.type === "application/json"
  ) {
    try {
      const text = await error.response.data.text();
      error.response.data = JSON.parse(text);
    } catch (e) {
      // If parsing fails, leave the blob as is
    }
  }

  const processed = !error
    ? PROCESSED_ERRORS.UNIDENTIFIED_ERROR
    : processError(error);
  if (processed.handleGlobally) {
    globalErrorHandler(processed);
  }
  return processed;
};

export const processError = (e) => {
  if (e.code == "ERR_NETWORK" && navigator.onLine) {
    return PROCESSED_ERRORS.BACKEND_DOWN;
  } else if (e.code == "ERR_NETWORK" && !navigator.onLine) {
    return PROCESSED_ERRORS.NETWORK_ERR;
  } else if (e.response?.data?.error) {
    switch (e.response?.data?.error) {
      case "WrongCredentialsException":
        return PROCESSED_ERRORS.WRONG_CREDENTIALS;
      case "AutoCompleteMalformedInputException":
        return PROCESSED_ERRORS.AUTOCOMPLETE_MALFORMED_INPUT;
      case "MaxUploadSizeExceededException":
        return PROCESSED_ERRORS.MAX_UPLOAD_SIZE_EXCEEDED;
      case "SizeLimitExceededException":
        return PROCESSED_ERRORS.SIZE_LIMIT_EXCEEDED;
      case "DuplicateEmailException":
        return PROCESSED_ERRORS.DUPLICATE_EMAIL;
      case "DesignNotAvailableException":
        return PROCESSED_ERRORS.DESIGN_NOT_AVAILABLE_EXCEPTION;
      case "ComponentDeleted":
      case "ComponentDeletedException":
        return PROCESSED_ERRORS.COMPONENT_DELETED;
      case "CodeChangeAfterPublishException":
        return PROCESSED_ERRORS.CODE_CHANGED_AFTER_PUBLISH;
      case "DesignOutOfSyncException":
        return PROCESSED_ERRORS.DESIGN_OUT_OF_SYNC;
      case "ExpiredResetTokenException":
        return PROCESSED_ERRORS.EXPIRED_RESET_TOKEN;
      case "WrongResetTokenException":
        return PROCESSED_ERRORS.WRONG_RESET_TOKEN;
      case "UsedConfirmationTokenException":
        return PROCESSED_ERRORS.USED_CONFIRMATION_TOKEN;
      case "ExpiredConfirmationTokenException":
        return PROCESSED_ERRORS.EXPIRED_CONFIRMATION_TOKEN;
      case "UserNotFoundException":
        return PROCESSED_ERRORS.USER_NOT_FOUND;
      case "DuplicateEmailException":
        return PROCESSED_ERRORS.DUPLICATE_EMAIL;
      case "MissingCredentialsException":
        return PROCESSED_ERRORS.MISSING_CREDENTIALS;
      case "SurveyDesignWithErrorException":
        return PROCESSED_ERRORS.SURVEY_DESIGN_ERROR;
      case "DuplicateSurveyException":
        return PROCESSED_ERRORS.DUPLICATE_SURVEY_NAME;
      case "SurveyIsNotActiveException":
        return PROCESSED_ERRORS.SURVEY_NOT_ACTIVE;
      case "SurveyExpiredException":
        return PROCESSED_ERRORS.SURVEY_EXPIRED;
      case "SurveyNotStartedException":
        return PROCESSED_ERRORS.SURVEY_SCHEDULED;
      case "SurveyIsClosedException":
        return PROCESSED_ERRORS.SURVEY_CLOSED;
      case "InvalidSurveyDates":
        return PROCESSED_ERRORS.INVALID_SURVEY_DATES;
      case "WrongConfirmationTokenException":
        return PROCESSED_ERRORS.WRONG_CONFIRMATION_TOKEN;
      case "ExpiredConfirmationTokenException":
        return PROCESSED_ERRORS.EXPIRED_CONFIRMATION_TOKEN;
      case "WrongEmailChangePinException":
        return PROCESSED_ERRORS.WRONG_PIN;
      case "SurveyQuotaExceeded":
        return PROCESSED_ERRORS.SURVEY_QUOTA;
      case "DuplicateToCodeException":
        return PROCESSED_ERRORS.DUPLICATE_TO_CODE;
      default:
        return PROCESSED_ERRORS.UNIDENTIFIED_ERROR;
    }
  }
};
