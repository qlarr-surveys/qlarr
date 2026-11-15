import React, { useEffect, useId } from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import {
  designStateReceived,
  setSaving,
  setup,
} from "~/state/design/designState";
import { useService } from "~/hooks/use-service";
import { useReleaseGuard } from "~/hooks/useReleaseGuard";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import {
  ALLOWED_CODE_CHARS_REGEX,
  computePrefixAndSuffix,
  getErrorMessage,
} from "~/utils/design/codeUtils";
import {
  SetupField,
  SetupHint,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";
import styles from "./EntityCodeEditor.module.css";

const cx = (...names) => names.filter(Boolean).join(" ");

function EntityCodeEditor({ code }) {
  const dispatch = useDispatch();
  const designService = useService("design");
  const { guard, modal } = useReleaseGuard();
  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);
  const help = useSetupHelp();
  const inputId = useId();
  const messageId = useId();

  const { currentSetup, saving } = useSelector(
    (state) => ({
      currentSetup: state.designState.setup,
      saving: state.designState.saving,
    }),
    shallowEqual
  );

  const [{ prefix, suffix }, setParts] = React.useState(() =>
    computePrefixAndSuffix(code)
  );

  const [error, setError] = React.useState(null);

  useEffect(() => {
    setParts(computePrefixAndSuffix(code));
    setError(null);
  }, [code]);

  const handleEntityCodeChange = React.useCallback((value) => {
    const sanitized = (value || "").replace(ALLOWED_CODE_CHARS_REGEX, "");
    setParts((prev) => ({ ...prev, suffix: sanitized }));
    setError(null);
  }, []);

  const fullCode = `${prefix || ""}${suffix || ""}`.trim();
  const isDirty = fullCode !== code;

  const performSave = React.useCallback(() => {
    dispatch(setSaving(true));
    setError(null);

    designService
      .changeCode(code, fullCode)
      .then((response) => {
        dispatch(designStateReceived(response));
        dispatch(setup({ ...currentSetup, code: fullCode }));
      })
      .catch((e) => {
        setError(e);
      })
      .finally(() => {
        dispatch(setSaving(false));
      });
  }, [code, dispatch, designService, fullCode, currentSetup]);

  const handleEntityCodeSave = React.useCallback(() => {
    if (!code || !isDirty) return;
    guard(performSave, { messageKey: "released_change_code" });
  }, [code, isDirty, guard, performSave]);

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (suffix) {
        handleEntityCodeSave();
      }
    } else if (event.key === "Escape" && isDirty) {
      // Back to the saved code, as the design's field does.
      event.preventDefault();
      setParts(computePrefixAndSuffix(code));
      setError(null);
    }
  };

  const canSubmit = !!code && isDirty && !saving && !!suffix;

  return (
    <SetupField label={t("entity_code")} help={help("entity_code")} htmlFor={inputId}>
      <div
        className={cx(
          styles.box,
          isDirty && styles.dirty,
          !!error && styles.error
        )}
      >
        {prefix && (
          <span className={styles.prefix} aria-hidden="true">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          type="text"
          value={suffix}
          onChange={(e) => handleEntityCodeChange(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-invalid={!!error}
          aria-describedby={error ? messageId : undefined}
          spellCheck={false}
          autoComplete="off"
          dir="ltr"
          className={styles.input}
        />
        <button
          type="button"
          onClick={handleEntityCodeSave}
          disabled={!canSubmit}
          className={styles.submit}
        >
          {t("change_code")}
        </button>
      </div>
      {error && (
        <SetupHint id={messageId} error>
          {getErrorMessage(error, t)}
        </SetupHint>
      )}
      {modal}
    </SetupField>
  );
}

export default EntityCodeEditor;
