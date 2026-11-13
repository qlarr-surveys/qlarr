import React from "react";
import {
  TextField,
  Box,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  FormGroup,
  Radio,
  Checkbox,
  FormHelperText,
} from "@mui/material";
import { Controller, useWatch } from "react-hook-form";
import * as yup from "yup";

/**
 * The statuses an export can include. Each non-preview response is in exactly
 * one: a disqualified response is only "disqualified", submitted or not.
 */
const EXPORT_STATUSES = [
  { value: "complete", label: "responses.status_complete" },
  { value: "incomplete", label: "responses.status_incomplete" },
  { value: "disqualified", label: "responses.disqualified" },
];
export const ALL_STATUSES = EXPORT_STATUSES.map((s) => s.value);
const MAX_RESPONSE_INDEX = 2147483647;

const MIN_RESPONSE_INDEX = 1;

export const responseIndexBounds = ({ range, from, to }) =>
  range === "all"
    ? { from: MIN_RESPONSE_INDEX, to: MAX_RESPONSE_INDEX }
    : { from: Number(from), to: Number(to) };

export const rangeAndStatusesSchema = (t) => {
  const min = MIN_RESPONSE_INDEX;
  return {
    range: yup.string().oneOf(["all", "custom"]).required(),
    from: yup.mixed().when("range", {
      is: "custom",
      then: () =>
        yup
          .number()
          .typeError(t("responses.enter_a_number"))
          .required(t("responses.enter_a_number"))
          .min(min, t("responses.min", { min })),
    }),
    to: yup.mixed().when("range", {
      is: "custom",
      then: () =>
        yup
          .number()
          .typeError(t("responses.enter_a_number"))
          .required(t("responses.enter_a_number"))
          .min(min, t("responses.min", { min }))
          .test("gte-from", t("responses.range_invalid"), function (value) {
            const { from } = this.parent;
            if (typeof from !== "number" || typeof value !== "number") return false;
            return value >= from;
          }),
    }),
    statuses: yup.array().of(yup.string().oneOf(ALL_STATUSES)).min(1),
  };
};

function RangeIndexField({ name, label, disabled, control, error }) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          label={label}
          type="number"
          disabled={disabled}
          inputProps={{ min: MIN_RESPONSE_INDEX }}
          error={!!error}
          helperText={error?.message || ""}
          onChange={(e) => {
            const v = e.target.value;
            field.onChange(v === "" ? "" : Number(v));
          }}
        />
      )}
    />
  );
}

export function RangeFields({ control, errors, t }) {
  const range = useWatch({ control, name: "range" });
  return (
    <>
      <Controller
        name="range"
        control={control}
        render={({ field }) => (
          <RadioGroup row {...field}>
            <FormControlLabel
              value="all"
              control={<Radio />}
              label={t("responses.all_responses")}
            />
            <FormControlLabel
              value="custom"
              control={<Radio />}
              label={t("responses.custom_range")}
            />
          </RadioGroup>
        )}
      />
      <Box display="flex" gap={2}>
        <RangeIndexField
          name="from"
          label={t("responses.from")}
          disabled={range !== "custom"}
          control={control}
          error={errors.from}
        />
        <RangeIndexField
          name="to"
          label={t("responses.to")}
          disabled={range !== "custom"}
          control={control}
          error={errors.to}
        />
      </Box>
    </>
  );
}

export function StatusesField({ control, t }) {
  return (
    <FormControl>
      <Controller
        name="statuses"
        control={control}
        render={({ field }) => {
          const picked = field.value;
          const toggle = (value) =>
            field.onChange(
              picked.includes(value)
                ? picked.filter((v) => v !== value)
                : ALL_STATUSES.filter((v) => v === value || picked.includes(v))
            );
          return (
            <>
              <FormLabel>{t("responses.responses_type")}</FormLabel>
              <FormGroup row>
                {EXPORT_STATUSES.map(({ value, label }) => (
                  <FormControlLabel
                    key={value}
                    control={
                      <Checkbox
                        checked={picked.includes(value)}
                        onChange={() => toggle(value)}
                      />
                    }
                    label={t(label)}
                  />
                ))}
              </FormGroup>
            </>
          );
        }}
      />
      <FormHelperText sx={{ color: "warning.main", ml: 0 }}>
        {t("responses.preview_not_exportable")}
      </FormHelperText>
    </FormControl>
  );
}
