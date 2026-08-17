import React, { useCallback, useEffect, useRef, useState } from "react";
import { Tooltip } from "@mui/material";
import { useTheme } from "@emotion/react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { designStateReceived, setSaving, setup } from "~/state/design/designState";
import { useService } from "~/hooks/use-service";
import { useReleaseGuard } from "~/hooks/useReleaseGuard";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { inDesign } from "~/routes";
import {
  ALLOWED_CODE_CHARS_REGEX,
  computePrefixAndSuffix,
  getErrorMessage,
  selectMaxSuffixLength,
} from "~/utils/design/codeUtils";
import styles from "./InlineCodeEditor.module.css";

const SPECIAL_TYPES = ["other", "all", "none", "other_text"];
const MAX_CODE_LENGTH = 10;

function InlineCodeEditor({ qualifiedCode, designMode, compact }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const designService = useService("design");
  const { guard, modal, pending } = useReleaseGuard();
  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);
  const inputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const { answerType, currentSetup } = useSelector(
    (state) => ({
      answerType: state.designState[qualifiedCode]?.type,
      currentSetup: state.designState.setup,
    }),
    shallowEqual
  );

  const isSpecial = SPECIAL_TYPES.includes(answerType);
  const isEditable = inDesign(designMode) && !isSpecial;

  const { prefix, suffix } = computePrefixAndSuffix(qualifiedCode);

  const maxSuffixLength = useSelector((state) =>
    selectMaxSuffixLength(state, prefix, suffix)
  );

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = useCallback(
    (e) => {
      if (!isEditable || isEditing) return;
      e.stopPropagation();
      setEditValue(suffix);
      setError(null);
      setIsEditing(true);
    },
    [isEditable, isEditing, suffix]
  );

  const handleChange = useCallback((e) => {
    const sanitized = (e.target.value || "").replace(
      ALLOWED_CODE_CHARS_REGEX,
      ""
    );
    setEditValue(sanitized);
    setError(null);
  }, []);

  const performSave = useCallback(
    (newFullCode) => {
      setIsSaving(true);
      setError(null);
      dispatch(setSaving(true));

      designService
        .changeCode(qualifiedCode, newFullCode)
        .then((response) => {
          dispatch(designStateReceived(response));
          if (currentSetup?.code === qualifiedCode) {
            dispatch(setup({ ...currentSetup, code: newFullCode }));
          }
          setIsEditing(false);
        })
        .catch((e) => {
          setError(e);
        })
        .finally(() => {
          setIsSaving(false);
          dispatch(setSaving(false));
        });
    },
    [qualifiedCode, designService, dispatch, currentSetup]
  );

  const handleSave = useCallback(() => {
    // `pending` short-circuits the blur that fires when the confirm modal steals focus.
    if (isSaving || pending) return;

    const newFullCode = prefix + editValue;
    if (!editValue.trim() || newFullCode === qualifiedCode) {
      setIsEditing(false);
      setError(null);
      return;
    }

    guard(() => performSave(newFullCode), {
      messageKey: "released_change_code",
      onCancel: () => {
        setIsEditing(false);
        setError(null);
      },
    });
  }, [isSaving, pending, prefix, editValue, qualifiedCode, guard, performSave]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsEditing(false);
        setError(null);
      }
    },
    [handleSave]
  );

  const hasAPrefix = qualifiedCode.includes("A");
  const displayText = hasAPrefix ? "A" + suffix : suffix;

  return (
    <span
      className={`${styles.codeLabel} ${!isEditable ? styles.codeLabelReadOnly : ""}`}
      style={{
        backgroundColor: theme.palette.grey[200],
        ...(!isEditing && compact
          ? { maxWidth: "4ch" }
          : { minWidth: `${maxSuffixLength + (hasAPrefix ? 1 : 0)}ch` }),
        ...(isEditing && { overflow: "visible" }),
      }}
      onClick={handleClick}
    >
      {isEditing ? (
        <Tooltip
          open={!!error}
          title={getErrorMessage(error, t)}
          placement="bottom"
          arrow
        >
          <span className={styles.editingContainer}>
            {hasAPrefix && (
              <span className={styles.prefixLabel}>A</span>
            )}
            <input
              ref={inputRef}
              value={editValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              disabled={isSaving}
              maxLength={MAX_CODE_LENGTH}
              onClick={(e) => e.stopPropagation()}
              className={styles.codeInputNative}
              data-code-input
            />
          </span>
        </Tooltip>
      ) : (
        displayText
      )}
      {modal}
    </span>
  );
}

export default InlineCodeEditor;
