import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { TextField } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { DateTimePicker } from "@mui/x-date-pickers";
import { serverDateTimeToLocalDateTime } from "~/utils/DateUtils";
import { fieldStyles as fields } from "~/components/manage/SettingsFields";
import styles from "./SurveyActiveFromTo.module.css";

const toLocal = (serverDate) =>
  serverDate ? dayjs(serverDateTimeToLocalDateTime(serverDate)) : null;

const sameInstant = (a, b) =>
  (!a && !b) || (!!a && !!b && a.valueOf() === b.valueOf());

// Empty, or a whole date and time: not something half typed.
const settled = (value) => !value || value.isValid();

const outOfOrder = (from, to) =>
  !!from && !!to && from.isValid() && to.isValid() && to.isBefore(from);

// The design's 36px field, drawn over MUI's outlined input.
const inputSx = (invalid) => ({
  "& .MuiOutlinedInput-root": {
    height: 36,
    paddingInlineEnd: "4px",
    borderRadius: "6px",
    background: "#fff",
    font: "400 13px Rubik, sans-serif",
    color: "#0e1338",
  },
  "& .MuiOutlinedInput-input": {
    height: "100%",
    boxSizing: "border-box",
    padding: "0 10px",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: invalid ? "#b3261e" : "#cfd5e8",
  },
  "& .MuiOutlinedInput-root:hover:not(.Mui-disabled) .MuiOutlinedInput-notchedOutline":
    {
      borderColor: invalid ? "#b3261e" : "#9aa1c0",
    },
  "& .MuiOutlinedInput-root.Mui-focused": {
    outline: "2px solid #0e1338",
    outlineOffset: "1px",
  },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderWidth: "1px",
    borderColor: invalid ? "#b3261e" : "#3a46d8",
  },
  // MUI's own error state (a half-typed date, or one before minDateTime)
  // would otherwise take the theme's error colour rather than the design's.
  "& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline": {
    borderColor: "#b3261e",
  },
  "& .MuiOutlinedInput-root.Mui-disabled": {
    background: "#f3f4f8",
  },
  "& .MuiIconButton-root": {
    color: "#4c5474",
  },
  "& .MuiSvgIcon-root": {
    fontSize: 18,
  },
});

/**
 * The survey's opening and closing date and time.
 *
 * A date saves once it is settled — picked in the calendar, or typed and left —
 * rather than on every keystroke, which would send half-typed dates. An end
 * before the start is not saved (the server would refuse it) and says why.
 */
export const SurveyActiveFromTo = ({
  surveyActiveFrom,
  surveyActiveTo,
  onSurveyActiveFromChanged,
  onSurveyActiveToChanged,
  disabled,
}) => {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const fromId = useId();
  const toId = useId();
  const messageId = useId();

  const savedFrom = useMemo(() => toLocal(surveyActiveFrom), [surveyActiveFrom]);
  const savedTo = useMemo(() => toLocal(surveyActiveTo), [surveyActiveTo]);
  const [from, setFrom] = useState(savedFrom);
  const [to, setTo] = useState(savedTo);
  // What the fields hold right now. The picker can report a change and close
  // in one go, before a re-render would hand its handlers the new value.
  const latest = useRef({ from: savedFrom, to: savedTo });

  // Each field follows only its own saved value, so the answer to saving one
  // can't wipe out what is being typed into the other.
  useEffect(() => {
    latest.current.from = savedFrom;
    setFrom(savedFrom);
  }, [savedFrom]);
  useEffect(() => {
    latest.current.to = savedTo;
    setTo(savedTo);
  }, [savedTo]);

  const change = (key, setValue) => (value) => {
    latest.current[key] = value;
    setValue(value);
  };

  const commit = () => {
    const { from: nextFrom, to: nextTo } = latest.current;
    if (!settled(nextFrom) || !settled(nextTo) || outOfOrder(nextFrom, nextTo)) {
      return;
    }
    if (!sameInstant(nextFrom, savedFrom)) {
      onSurveyActiveFromChanged(nextFrom ? nextFrom.toDate() : null);
    }
    if (!sameInstant(nextTo, savedTo)) {
      onSurveyActiveToChanged(nextTo ? nextTo.toDate() : null);
    }
  };

  const invalidOrder = outOfOrder(from, to);

  const field = (id, value, onChange, extra = {}) => (
    <DateTimePicker
      value={value}
      disabled={disabled}
      onChange={onChange}
      onAccept={(accepted) => {
        onChange(accepted);
        commit();
      }}
      onClose={commit}
      renderInput={(params) => (
        <TextField
          {...params}
          id={id}
          // The app's theme makes TextFields filled by default.
          variant="outlined"
          size="small"
          fullWidth
          onBlur={(event) => {
            params.onBlur?.(event);
            commit();
          }}
          sx={inputSx(extra.invalid)}
          inputProps={{
            ...params.inputProps,
            "aria-invalid": extra.invalid || undefined,
            "aria-describedby": extra.describedBy,
          }}
        />
      )}
      {...extra.pickerProps}
    />
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div className={styles.pair}>
        <div className={fields.subLabel}>
          <label htmlFor={fromId}>{t("label.from")}</label>
          {field(fromId, from, change("from", setFrom))}
        </div>
        <div className={fields.subLabel}>
          <label htmlFor={toId}>{t("label.to")}</label>
          {field(toId, to, change("to", setTo), {
            invalid: invalidOrder,
            describedBy: messageId,
            pickerProps: {
              minDateTime: from?.isValid() ? from : undefined,
            },
          })}
        </div>
      </div>
      {invalidOrder ? (
        <p id={messageId} role="alert" className={fields.error}>
          {t("edit_survey.dates_out_of_order")}
        </p>
      ) : (
        <p id={messageId} className={fields.note}>
          {t("timezone_info")}
        </p>
      )}
    </LocalizationProvider>
  );
};
