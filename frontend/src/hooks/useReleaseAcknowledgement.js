import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

// Builds the acknowledgement props for ConfirmActionModal used by released-survey
// destructive-action warnings. Centralizes the shared copy so every warning surface
// (delete question/page/option, change code) stays in sync from one place.
//
// Usage:
//   const released = useIsReleased();
//   const ack = useReleaseAcknowledgement(released);
//   <ConfirmActionModal {...ack} ... />
export function useReleaseAcknowledgement(required) {
  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);
  return {
    requireAcknowledgement: required,
    acknowledgementLabel: t("released_ack_label"),
    acknowledgementTooltipTitle: t("released_ack_tooltip_title"),
    acknowledgementTooltipBody: t("released_ack_tooltip_body"),
  };
}
