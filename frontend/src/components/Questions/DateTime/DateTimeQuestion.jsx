import React from "react";
import TextField from "@mui/material/TextField";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import styles from "./DateTimeQuestion.module.css";
import { useTheme } from "@mui/system";
import { valueChange } from "~/state/runState";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

function DateTimeQuestion(props) {
  const theme = useTheme();
  const { i18n } = useTranslation(NAMESPACES.RUN);

  // Adapt the picker popup to the survey theme so its text stays legible on both
  // light and dark survey themes (instead of a hardcoded white background).
  const pickerPaperProps = {
    sx: {
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
    },
  };

  const state = useSelector((state) => {
    let own = state.runState.values[props.component.qualifiedCode];
    let show_errors = state.runState.values.Survey.show_errors;
    let isDirty = state.templateState[props.component.qualifiedCode];
    return {
      invalid: (show_errors || isDirty) && own?.validity === false,
      value: own?.value
        ? dayjs(window.QlarrScripts.sqlDateTimeToDate(own?.value))
        : null,
    };
  }, shallowEqual);
  const dispatch = useDispatch();

  const handleDateChange = (date) => {
    let finalDate = date === null ? undefined : date.toDate();
    dispatch(
      valueChange({
        componentCode: props.component.qualifiedCode,

        value:
          props.component.type == "date_time"
            ? window.QlarrScripts.toSqlDateTime(finalDate)
            : props.component.type == "time"
              ? window.QlarrScripts.toSqlDateTimeIgnoreDate(finalDate)
              : window.QlarrScripts.toSqlDateTimeIgnoreTime(finalDate),
      })
    );
  };

  const dateFormat = props.component.dateFormat
    ? props.component.dateFormat
    : "DD.MM.YYYY";

  const timeFormat = props.component.fullDayFormat ? "HH:mm" : "hh:mm A";
  const defaultFormat =
    props.component.type === "time"
      ? timeFormat
      : props.component.type === "date_time"
        ? dateFormat + " " + timeFormat
        : dateFormat;

  const hintLabel =
    (props.component.showHint && props.component.content?.hint) || defaultFormat;

  return (
    <div className={styles.wrapper}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={i18n.language}>
        {props.component.type == "date_time" ? (
          <>
            <DateTimePicker
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label={hintLabel}
                  onKeyDown={(e) => e.preventDefault()} />
              )}
              margin="normal"
              value={state.value}
              inputFormat={
                dateFormat +
                " " +
                (props.component.fullDayFormat ? "HH:mm" : "hh:mm A")
              }
              PaperProps={pickerPaperProps}

              ampm={props.component.fullDayFormat ? false : true}
              openTo="year"
              views={["year", "month", "day", "hours", "minutes"]}
              id={props.component.qualifiedCode}
              minDate={
                props.component.minDate
                  ? dayjs(
                    window.QlarrScripts.dateStringToDate(
                      props.component.minDate
                    )
                  )
                  : undefined
              }
              maxDate={
                props.component.maxDate
                  ? dayjs(
                    window.QlarrScripts.dateStringToDate(
                      props.component.maxDate
                    )
                  )
                  : undefined
              }
              error={state.invalid}
              onChange={handleDateChange}
            />
          </>
        ) : props.component.type == "time" ? (
          <TimePicker
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label={hintLabel}
                onKeyDown={(e) => e.preventDefault()} />
            )}
            margin="normal"
            openTo="hours"
            views={["hours", "minutes"]}
            ampm={props.component.fullDayFormat ? false : true}
            inputFormat={props.component.fullDayFormat ? "HH:mm" : "hh:mm A"}
            id={props.component.qualifiedCode}
            value={state.value}
            error={state.invalid}
            onChange={handleDateChange}
            PaperProps={pickerPaperProps}
          />
        ) : (
          <DatePicker
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label={hintLabel}
                onKeyDown={(e) => e.preventDefault()} />
            )}
            margin="normal"
            openTo="year"
            views={["year", "month", "day"]}
            ampm={props.component.fullDayFormat ? false : true}
            id={props.component.qualifiedCode}
            inputFormat={dateFormat}
            value={state.value}
            minDate={
              props.component.minDate
                ? window.QlarrScripts.dateStringToDate(
                  props.component.minDate
                )
                : undefined
            }
            PaperProps={pickerPaperProps}
            maxDate={
              props.component.maxDate
                ? window.QlarrScripts.dateStringToDate(
                  props.component.maxDate
                )
                : undefined
            }
            error={state.invalid}
            onChange={handleDateChange}
          />
        )}
      </LocalizationProvider>
    </div>
  );
}

export default DateTimeQuestion;
