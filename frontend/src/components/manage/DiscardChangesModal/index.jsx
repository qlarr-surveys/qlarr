import React from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import ConfirmActionModal from "~/components/common/ConfirmActionModal";

function DiscardChangesModal({ open, isLoading, onClose, onConfirm }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);

  return (
    <ConfirmActionModal
      open={open}
      title={t("launch.discard_title")}
      description={t("launch.discard_description")}
      cancelLabel={t("action_btn.cancel")}
      confirmLabel={t("launch.discard_changes")}
      requireAcknowledgement
      acknowledgementLabel={t("version_history.restore_acknowledge")}
      isLoading={isLoading}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

export default React.memo(DiscardChangesModal);
