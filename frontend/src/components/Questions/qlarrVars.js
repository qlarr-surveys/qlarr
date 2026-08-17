export function qlarrCssVars(theme) {
  return {
    "--qlarr-on-paper": theme.palette.text.primary,
    "--qlarr-hover-paper": theme.palette.action?.hover || "transparent",
    "--qlarr-mild-border": theme.palette.divider,
    "--qlarr-error": theme.palette.error?.main || "#d32f2f",
    "--qlarr-primary": theme.palette.primary?.main || theme.palette.text.primary,
    "--qlarr-text-secondary": theme.palette.text.secondary,
    "--qlarr-text-disabled": theme.palette.text.disabled,
    "--qlarr-bg-default": theme.palette.background.default,
    "--qlarr-bg-paper": theme.palette.background.paper,
    "--qlarr-action-hover": theme.palette.action?.hover || "transparent",
    "--qlarr-divider": theme.palette.divider,
  };
}
