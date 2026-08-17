import React, { useMemo } from "react";
import PropTypes from "prop-types";

import CssBaseline from "@mui/material/CssBaseline";
import {
  createTheme,
  ThemeProvider as MuiThemeProvider,
} from "@mui/material/styles";

import { palette } from "./palette";
import { shadows } from "./shadows";
import { typography } from "./typography";
import RTL from "./options/right-to-left";
import { customShadows } from "./custom-shadows";
import { componentsOverrides } from "./overrides";
import { createPresets } from "./options/presets";
import { rtlLanguage } from "~/utils/common";

// ----------------------------------------------------------------------

export default function ThemeProvider({ children }) {
  const themeMode = "light";
  const lang = localStorage.getItem("lang");

  const presets = createPresets("default");
  const direction = useMemo(
    () => (rtlLanguage.includes(lang) ? "rtl" : "ltr"),
    [lang]
  );

  const theme = createTheme({
    palette: {
      ...palette(themeMode),
      ...presets.palette,
    },
    customShadows: {
      ...customShadows(themeMode),
      ...presets.customShadows,
    },
    direction: "ltr",
    shadows: shadows(themeMode),
    shape: { borderRadius: 8 },
    typography,
  });

  theme.components = componentsOverrides(theme);

  return (
    <MuiThemeProvider theme={theme}>
      <RTL themeDirection={direction}>
        <CssBaseline />
        {children}
      </RTL>
    </MuiThemeProvider>
  );
}

ThemeProvider.propTypes = {
  children: PropTypes.node,
};
