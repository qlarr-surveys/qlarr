import { alpha } from "@mui/material/styles";

import { grey, primary, secondary } from "../palette";

// ----------------------------------------------------------------------

export function createPresets(preset) {
  const { primary: primaryColor, secondary: secondaryColor } =
    getPrimary(preset);

  const theme = {
    palette: {
      primary: primaryColor,
      secondary: secondaryColor,
    },
    customShadows: {
      primary: `0 8px 16px 0 ${alpha(`${primaryColor.main}`, 0.24)}`,
      secondary: `0 8px 16px 0 ${alpha(`${secondaryColor.main}`, 0.24)}`,
    },
  };

  return {
    ...theme,
  };
}

export const presetOptions = [
  { name: "default", value: [primary.main, secondary.main] },
];

export function getPrimary(preset) {
  return {
    default: { primary, secondary },
  }[preset];
}
