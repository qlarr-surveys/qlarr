import React from "react";
import { useTranslation } from "react-i18next";
import { Chip, Tooltip, Typography } from "@mui/material";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

/**
 * One calculated value, in one of its states:
 * - `value`: the result as text (objects and arrays as JSON);
 * - `error`: a red chip (the calculation failed on this response); `message`,
 *   when given (Test only), is shown as a tooltip;
 * - `empty`: a muted dash (no value);
 * - `not_computed`: a grey chip;
 * - `invalid`: a red outlined chip, for a calculation with validation errors
 *   (it never runs; Test only).
 */
function CalculationValue({ state, value, message }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);

  switch (state) {
    case "value":
      return (
        <Typography
          variant="body2"
          sx={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}
        >
          {value !== null && typeof value === "object"
            ? JSON.stringify(value)
            : String(value)}
        </Typography>
      );
    case "error": {
      const chip = (
        <Chip
          size="small"
          color="error"
          label={t("calculations.state_error", "Error")}
        />
      );
      return message ? <Tooltip title={message}>{chip}</Tooltip> : chip;
    }
    case "invalid":
      return (
        <Chip
          size="small"
          color="error"
          variant="outlined"
          label={t("calculations.state_invalid", "Invalid")}
        />
      );
    case "not_computed":
      return (
        <Chip
          size="small"
          label={t("calculations.state_not_computed", "Not computed")}
        />
      );
    default:
      return (
        <Typography variant="body2" color="text.disabled">
          —
        </Typography>
      );
  }
}

export default React.memo(CalculationValue);
