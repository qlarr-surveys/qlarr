import React, {
  useCallback,
  useState,
  useEffect,
  useRef,
} from "react";
import styles from "./ContentEditor.module.css";
import "~/styles/tiptap-editor.css";
import { Box, css, useTheme } from "@mui/material";
import TipTapEditor from "./TipTapEditor";
import { rtlLanguage } from "~/utils/common";
import { useDispatch } from "react-redux";
import { changeContent, resetFocus } from "~/state/design/designState";
import { useSelector } from "react-redux";
import { isNotEmptyHtml, appendRequiredAsterisk } from "~/utils/design/utils";
import {
  useCollapsibleHandler,
  ensureCollapsiblesClosed,
} from "~/hooks/useCollapsibleHandler";
import { EDITOR_CONSTANTS } from "~/constants/editor";
import { useReferenceTooltips } from "./useReferenceTooltips";

const { CONTENT_EDITOR_CLASS, RTL_CLASS, LTR_CLASS } = EDITOR_CONSTANTS;

function ContentEditor({
  placeholder,
  extended,
  contentKey,
  onNewLine,
  code,
  onMoreLines,
  editable,
  customStyle,
  showToolbar = true,
  centerText = false,
  required = false,
}) {
  const dispatch = useDispatch();
  const theme = useTheme();

  const content = useSelector((state) => {
    return state.designState[code].content;
  });

  const focus = useSelector((state) => {
    return contentKey == "label" && state.designState["focus"] == code;
  });

  const index = useSelector((state) => {
    return state.designState.index;
  });

  const langInfo = useSelector((state) => {
    return state.designState.langInfo;
  });

  const lang = langInfo.lang;
  const mainLang = langInfo.mainLang;
  const onMainLang = langInfo.onMainLang;

  const value = content?.[lang]?.[contentKey] || "";
  const [isActive, setActive] = useState(false);
  const renderedContentRef = useRef(null);

  const rawInstructionList = useSelector((state) => {
    return isActive ? [] : state.designState[code].instructionList || [];
  });

  const { fixedValue } = useReferenceTooltips({
    rawInstructionList,
    contentKey,
    lang,
    value,
    index,
    mainLang,
    isActive,
    renderedContentRef,
  });

  const finalPlaceholder = onMainLang
    ? placeholder
    : isNotEmptyHtml(content?.[mainLang]?.[contentKey])
      ? content?.[mainLang]?.[contentKey]
      : placeholder;

  useEffect(() => {
    if (focus && !isActive && editable) {
      setActive(true);
    }
  }, [focus, isActive, editable]);

  const OnEditorBlurred = useCallback(
    (text, editorLang) => {
      setActive(false);
      dispatch(resetFocus());
      if (lang !== editorLang) {
        return;
      }
      const normalizedText = isNotEmptyHtml(text) ? text : "";
      if (normalizedText !== value) {
        dispatch(
          changeContent({ code, key: contentKey, lang, value: normalizedText }),
        );
      }
    },
    [value, lang, code, contentKey, dispatch],
  );

  const onContainerClicked = (event) => {
    event.preventDefault();
    setActive(true);
  };

  const isRtl = rtlLanguage.includes(lang);

  useCollapsibleHandler(renderedContentRef, !isActive ? fixedValue : null);

  return (
    <Box
      className={`${styles.fullWidth}${centerText ? " tiptap-centered" : ""}`}
      css={css`
        ${customStyle}
      `}
      onClick={(e) => {
        if (editable) {
          onContainerClicked(e);
        }
      }}
    >
      {isActive ? (
        <TipTapEditor
          lang={lang}
          isRtl={isRtl}
          onMoreLines={onMoreLines}
          onNewLine={onNewLine}
          code={code}
          extended={extended}
          showToolbar={showToolbar}
          onBlurListener={OnEditorBlurred}
          value={value}
        />
      ) : isNotEmptyHtml(value) ? (
        <div
          ref={renderedContentRef}
          className={`${CONTENT_EDITOR_CLASS} ${isRtl ? RTL_CLASS : LTR_CLASS} ${
            styles.noPadding
          }`}
          dangerouslySetInnerHTML={{
            __html: required
              ? appendRequiredAsterisk(
                  ensureCollapsiblesClosed(fixedValue),
                  theme.palette.error.main
                )
              : ensureCollapsiblesClosed(fixedValue),
          }}
        />
      ) : (
        <div
          className={`${isRtl ? RTL_CLASS : LTR_CLASS} ${styles.placeholder}`}
          dangerouslySetInnerHTML={{ __html: finalPlaceholder }}
        />
      )}
    </Box>
  );
}
export default React.memo(ContentEditor);
