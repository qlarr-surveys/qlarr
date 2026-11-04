import React, { useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  InputAdornment,
  Typography,
} from "@mui/material";
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

function EntityCodeEditor({ code }) {
  const dispatch = useDispatch();
  const designService = useService("design");
  const { guard, modal } = useReleaseGuard();
  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);

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
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-end",
        gap: 1,
        mb: 1,
      }}
    >
      <TextField
        fullWidth
        size="small"
        label={t("entity_code")}
        value={suffix}
        onChange={(e) => handleEntityCodeChange(e.target.value)}
        onKeyDown={handleKeyDown}
        error={!!error}
        helperText={getErrorMessage(error, t)}
        InputProps={{
          startAdornment: prefix && (
            <InputAdornment position="start" sx={{ mr: 0.2 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                {prefix}
              </Typography>
            </InputAdornment>
          ),
        }}
      />
      <Button
        variant="contained"
        color="primary"
        onClick={handleEntityCodeSave}
        disabled={!code || !isDirty || saving || !suffix}
      >
        {t("submit")}
      </Button>
      {modal}
    </Box>
  );
}

export default EntityCodeEditor;
