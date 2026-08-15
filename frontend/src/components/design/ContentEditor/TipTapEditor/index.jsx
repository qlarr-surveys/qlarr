import React, {
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useState,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { sanitizePastedText } from "../sanitizePastedText";
import Toolbar from "./Toolbar";
import CollapsibleSettings from "./CollapsibleSettings";
import { buildReferences } from "~/components/Questions/buildReferences";
import { manageStore } from "~/store";
import "~/styles/tiptap-editor.css";
import { EDITOR_CONSTANTS } from "~/constants/editor";
import { createAllExtensions } from "./extensions";
import QuestionDisplayTransformer from "~/utils/QuestionDisplayTransformer";

const {
  BLUR_TIMEOUT_MS,
  CONTENT_SYNC_TIMEOUT_MS,
  EMPTY_PARAGRAPH_HTML,
  EDITOR_CLASS,
  EDITOR_WRAPPER_CLASS,
  EDITOR_FOCUSED_CLASS,
  RTL_CLASS,
  LTR_CLASS,
} = EDITOR_CONSTANTS;

function TipTapEditor({
  value,
  onBlurListener,
  extended,
  isRtl,
  lang,
  onNewLine,
  onMoreLines,
  code,
  showToolbar = true,
}) {
  const editorRef = useRef(null);
  const wrapperRef = useRef(null);
  const blurTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const [isFocused, setIsFocused] = useState(false);

  const [collapsibleSettings, setCollapsibleSettings] = useState({
    show: false,
    position: null,
    attrs: null,
    pos: null,
  });

  const getMentionSuggestions = useCallback(
    (query) => {
      const designState = manageStore.getState().designState;
      const values = buildReferences(
        designState.componentIndex,
        code,
        designState,
        designState.langInfo.mainLang
      );

      if (query.length === 0) {
        return values;
      }

      const lowerQuery = query.toLowerCase();
      return values.filter((item) =>
        item.value.toLowerCase().includes(lowerQuery)
      );
    },
    [code]
  );

  const extensions = useMemo(() => {
    return createAllExtensions({
      getMentionSuggestions,
      extended,
      onNewLine,
      onBlurListener,
      lang,
    });
  }, [
    getMentionSuggestions,
    extended,
    onNewLine,
    onBlurListener,
    lang,
  ]);

  const editor = useEditor({
    extensions,
    content: value || "",
    onCreate: ({ editor }) => {
      const html = QuestionDisplayTransformer.decodeInstructionEntities(
        editor.getHTML()
      );
      editorRef.current = html;
    },
    editorProps: {
      attributes: {
        class: `${EDITOR_CLASS} ${isRtl ? RTL_CLASS : LTR_CLASS}`,
      },
      handlePaste: (view, event) => {
        try {
          const text = event.clipboardData?.getData("text/plain");
          if (!text) {
            return false;
          }

          const isChoiceOption = typeof onMoreLines === "function";
          const isExtended = extended;

          if (isExtended) {
            return false;
          }

          event.preventDefault();
          const sanitizedLines = sanitizePastedText(text);
          const nonEmptyLines = sanitizedLines.filter(line => line.trim().length > 0);

          if (nonEmptyLines.length === 0) {
            return true;
          }

          const { state, dispatch } = view;
          const { selection } = state;

          if (isChoiceOption) {
            const firstLine = nonEmptyLines[0];
            const restLines = nonEmptyLines.slice(1);

            const transaction = state.tr.insertText(
              firstLine,
              selection.from,
              selection.to
            );
            dispatch(transaction);

            if (restLines.length > 0) {
              onMoreLines(restLines);
            }
          } else {
            const singleLine = nonEmptyLines.join(" ");
            const transaction = state.tr.insertText(
              singleLine,
              selection.from,
              selection.to
            );
            dispatch(transaction);
          }

          return true;
        } catch (error) {
          console.error("[TipTapEditor] Error handling paste:", error);
          return false;
        }
      },
    },
    onUpdate: ({ editor }) => {
      const currentHtml = editor.getHTML();
      const html = QuestionDisplayTransformer.decodeInstructionEntities(
        currentHtml
      );
      editorRef.current = html;
      if (currentHtml !== html) {
        editor.commands.setContent(html, false);
      }
    },
    onFocus: () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      setIsFocused(true);
    },
    onBlur: () => {
      blurTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) {
          return;
        }

        const activeElement = document.activeElement;

        if (wrapperRef.current && wrapperRef.current.contains(activeElement)) {
          if (editor?.isFocused) {
            setIsFocused(true);
          }
          return;
        }

        if (
          activeElement &&
          activeElement.tagName === "INPUT" &&
          activeElement.type === "file"
        ) {
          return;
        }

        setIsFocused(false);
        const currentHtml = editorRef.current || "";
        onBlurListener(currentHtml, lang);
      }, BLUR_TIMEOUT_MS);
    },
  });

  useEffect(() => {
    if (editor) {
      editor.commands.focus("end");
    }
  }, [editor]);

  useEffect(() => {
    if (editor && extensions) {
      editor.setOptions({
        extensions,
      });
    }
  }, [editor, extensions]);

  useEffect(() => {
    const handleCollapsibleSettingsClick = (e) => {
      const { pos, attrs, buttonRect } = e.detail;
      setCollapsibleSettings({
        show: true,
        position: buttonRect,
        attrs,
        pos,
      });
    };

    const wrapper = wrapperRef.current;
    if (wrapper) {
      wrapper.addEventListener(
        "collapsible-settings-click",
        handleCollapsibleSettingsClick
      );
      return () => {
        wrapper.removeEventListener(
          "collapsible-settings-click",
          handleCollapsibleSettingsClick
        );
      };
    }
  }, []);

  const handleCollapsibleUpdate = useCallback(
    (attrs) => {
      if (editor && collapsibleSettings.pos !== null) {
        editor.commands.command(({ tr, dispatch }) => {
          const nodeAtPos = tr.doc.nodeAt(collapsibleSettings.pos);
          if (nodeAtPos && nodeAtPos.type.name === "collapsible") {
            if (dispatch) {
              tr.setNodeMarkup(collapsibleSettings.pos, undefined, {
                ...nodeAtPos.attrs,
                ...attrs,
              });
            }
            return true;
          }
          return false;
        });
      }
    },
    [editor, collapsibleSettings.pos]
  );

  const handleCloseCollapsibleSettings = useCallback(() => {
    setCollapsibleSettings({
      show: false,
      position: null,
      attrs: null,
      pos: null,
    });
  }, []);

  useEffect(() => {
    if (editor && !editorRef.current) {
      if (!editorRef.current) {
        editorRef.current = QuestionDisplayTransformer.decodeInstructionEntities(
          editor.getHTML()
        );
      }
      if (!editorRef.current || editorRef.current === EMPTY_PARAGRAPH_HTML) {
        editor.commands.focus("end");
      }
    }
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (editor.isFocused) {
      return;
    }

    const currentContent = editorRef.current || "";
    const normalizedValue = value || "";
    const normalizedCurrent =
      currentContent === EMPTY_PARAGRAPH_HTML ? "" : currentContent;

    if (normalizedValue === normalizedCurrent) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (!editor || editor.isDestroyed) {
        return;
      }

      if (editor.isFocused) {
        return;
      }

      const finalCurrentContent = editorRef.current || "";
      const finalNormalizedCurrent =
        finalCurrentContent === EMPTY_PARAGRAPH_HTML ? "" : finalCurrentContent;

      if (normalizedValue !== finalNormalizedCurrent) {
        editor.commands.setContent(normalizedValue);
      }
    }, CONTENT_SYNC_TIMEOUT_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, editor]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div
      ref={wrapperRef}
      className={`${EDITOR_WRAPPER_CLASS} ${isFocused ? EDITOR_FOCUSED_CLASS : ""}`}
    >
      <EditorContent editor={editor} />
      {showToolbar && isFocused && (
        <Toolbar editor={editor} extended={extended} />
      )}
      <CollapsibleSettings
        show={collapsibleSettings.show && isFocused}
        position={collapsibleSettings.position}
        collapsibleAttrs={collapsibleSettings.attrs}
        onUpdate={handleCollapsibleUpdate}
        onClose={handleCloseCollapsibleSettings}
        editor={editor}
      />
    </div>
  );
}

export default React.memo(TipTapEditor);
