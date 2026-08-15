import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { TextField, FormHelperText, Button, Box } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { DateTimePicker } from "@mui/x-date-pickers";
import { serverDateTimeToLocalDateTime } from "~/utils/DateUtils";

const renderInput = (props) => {
  return (
    <TextField
      {...props}
      variant="outlined"
      size="small"
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: "16px",
          backgroundColor: "#f7f8fc",
          border: "none",
        },
        "& .MuiInputLabel-root": {
          color: "#a6a8ab",
          fontWeight: "500",
        },
        "& .MuiOutlinedInput-notchedOutline": {
          border: "none",
        },
      }}
    />
  );
};

export const SurveyActiveFromTo = ({
  error,
  surveyActiveFrom: initialSurveyActiveFrom,
  surveyActiveTo: initialSurveyActiveTo,
  onSurveyActiveFromChanged,
  onSurveyActiveToChanged,
  disabled,
}) => {
  const { t } = useTranslation(NAMESPACES.MANAGE);

  const convertUTCToLocal = (utcDateString) => {
    if (!utcDateString) return null;
    try {
      const localDate = serverDateTimeToLocalDateTime(utcDateString);
      return dayjs(localDate);
    } catch {
      return utcDateString;
    }
  };

  const [surveyActiveFrom, setSurveyActiveFrom] = useState(
    convertUTCToLocal(initialSurveyActiveFrom)
  );
  const [surveyActiveTo, setSurveyActiveTo] = useState(
    convertUTCToLocal(initialSurveyActiveTo)
  );
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setSurveyActiveFrom(convertUTCToLocal(initialSurveyActiveFrom));
    setSurveyActiveTo(convertUTCToLocal(initialSurveyActiveTo));
  }, [initialSurveyActiveFrom, initialSurveyActiveTo]);

  const handleSurveyActiveFromChange = (newValue) => {
    setSurveyActiveFrom(newValue);
    setIsDirty(true);
  };

  const handleSurveyActiveToChange = (newValue) => {
    setSurveyActiveTo(newValue);
    setIsDirty(true);
  };

  const handleSaveChanges = () => {
    const fromChanged = dayjs(surveyActiveFrom).toDate();
    const toChanged = dayjs(surveyActiveTo).toDate();

    if (surveyActiveFrom && !isEqualDates(fromChanged, dayjs(initialSurveyActiveFrom).toDate())) {
      onSurveyActiveFromChanged(fromChanged);
    }

    if (surveyActiveTo && !isEqualDates(toChanged, dayjs(initialSurveyActiveTo).toDate())) {
      onSurveyActiveToChanged(toChanged);
    }

    setIsDirty(false);
  };

  function isEqualDates(date1, date2) {
    if (!date1 && !date2) return true;
    if (!date1 || !date2) return false;
    return date1.getTime() === date2.getTime();
  }
  return (
    <Box display="flex" flexDirection="column" width="100%" gap={2}>

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box display="flex" gap={2}>
          <DateTimePicker
            disabled={disabled}
            label={t("label.from")}
            value={surveyActiveFrom}
            onChange={handleSurveyActiveFromChange}
            renderInput={renderInput}
          />
          <DateTimePicker
            disabled={disabled}
            label={t("label.to")}
            value={surveyActiveTo}
            onChange={handleSurveyActiveToChange}
            renderInput={renderInput}
          />
        </Box>
        {error && (
          <FormHelperText style={{ color: "red" }}>{error}</FormHelperText>
        )}
        {isDirty && (
          <Button onClick={handleSaveChanges} variant="contained" color="primary">
            {t("save_changes")}
          </Button>
        )}
      </LocalizationProvider>
    </Box>

  );
};
