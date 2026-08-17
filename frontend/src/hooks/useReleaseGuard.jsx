import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useBoolean } from "~/hooks/use-boolean";
import { useIsReleased } from "~/hooks/useIsReleased";
import { useReleaseAcknowledgement } from "~/hooks/useReleaseAcknowledgement";
import ConfirmActionModal from "~/components/common/ConfirmActionModal";

const DEFAULT_MESSAGE_KEY = "released_warning";

// Guards a destructive design action behind a confirmation modal.
//
// By default it only prompts when the survey is released — otherwise the action
// runs immediately so the editor keeps its usual frictionless behavior. Callers
// that want a confirmation even on an unreleased survey pass `confirmWhenUnreleased`
// together with the plain (non-release) copy; when the survey IS released the modal
// upgrades to the warning title + acknowledgement checkbox automatically.
//
// guard(action, {
//   messageKey,            // released description key (defaults to "released_warning")
//   onCancel,
//   confirmWhenUnreleased, // also prompt when NOT released (plain confirmation)
//   unreleasedTitleKey,    // title key when not released (defaults to "delete")
//   unreleasedMessageKey,  // description key when not released
//   confirmLabelKey,       // confirm button label key (defaults to "confirm")
// })
//
// Usage:
//   const { released, guard, modal, pending } = useReleaseGuard();
//   <Btn onClick={() => guard(() => dispatch(removeAnswer(code)),
//                            { messageKey: "released_delete_option" })} />
//   {modal}
export function useReleaseGuard() {
  const released = useIsReleased();
  const ack = useReleaseAcknowledgement(released);
  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);
  const open = useBoolean(false);
  const pendingConfirm = useRef(null);
  const pendingCancel = useRef(null);
  const [opts, setOpts] = useState({});

  const guard = useCallback(
    (action, options = {}) => {
      if (!released && !options.confirmWhenUnreleased) {
        action();
        return;
      }
      pendingConfirm.current = action;
      pendingCancel.current = options.onCancel || null;
      setOpts(options);
      open.onTrue();
    },
    [released, open]
  );

  const onClose = useCallback(() => {
    const cancel = pendingCancel.current;
    pendingConfirm.current = null;
    pendingCancel.current = null;
    open.onFalse();
    cancel?.();
  }, [open]);

  const onConfirm = useCallback(() => {
    const confirm = pendingConfirm.current;
    pendingConfirm.current = null;
    pendingCancel.current = null;
    open.onFalse();
    confirm?.();
  }, [open]);

  const modal = (
    <ConfirmActionModal
      open={open.value}
      title={t(released ? "released_warning_title" : opts.unreleasedTitleKey || "delete")}
      description={t(
        released
          ? opts.messageKey || DEFAULT_MESSAGE_KEY
          : opts.unreleasedMessageKey || ""
      )}
      cancelLabel={t("cancel")}
      confirmLabel={t(opts.confirmLabelKey || "confirm")}
      confirmColor="error"
      {...ack}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );

  return { released, guard, modal, pending: open.value };
}
