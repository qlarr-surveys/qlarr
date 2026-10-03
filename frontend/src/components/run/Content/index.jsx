import React, { useRef } from "react";
import { useSelector } from "react-redux";
import "~/styles/tiptap-editor.css";
import { rtlLanguage } from "~/utils/common";
import {
  useCollapsibleHandler,
  ensureCollapsiblesClosed,
} from "~/hooks/useCollapsibleHandler";
import { css } from "@emotion/react";
import { replaceFormatInstructions } from "@qlarr/design-core";

// Re-exported so existing callers can keep importing it from here; the
// implementation now lives in @qlarr/design-core.
export { replaceFormatInstructions };

function Content(props) {
  const contentRef = useRef(null);
  const isComplex = props.content && props.content.includes("{{");
  const content = props.content;
  const name = props.name;
  const elementCode = props.elementCode;
  const customStyle = props.customStyle;
  console.log("elementCode", elementCode)
  console.log("isComplex", isComplex)
  const state = useSelector((state) => {
    if (
      !content ||
      !isComplex ||
      !state.runState.values[elementCode] ||
      !name
    ) {
      return undefined;
    } else {
      return state.runState.values[elementCode];
    }
  });

  const surveyLang = useSelector((state) => {
    return state.runState.values["Survey"].lang;
  });

  const isRtl = rtlLanguage.includes(surveyLang);

  // Handle collapsible button clicks in rendered view
  useCollapsibleHandler(contentRef, props.content);

  if (!props.content) {
    return <span style={{ flex: 1 }} />;
  } else if (!isComplex) {
    return (
      <div
        ref={contentRef}
        css={css`
          ${customStyle}
        `}
        className={`${isRtl ? "rtl" : "ltr"} content-editor no-padding`}
        dangerouslySetInnerHTML={{
          __html: ensureCollapsiblesClosed(props.content),
        }}
      />
    );
  } else {
    return (
      <div
        ref={contentRef}
        css={css`
          ${customStyle}
        `}
        className={`${isRtl ? "rtl" : "ltr"} ql-editor no-padding`}
        dangerouslySetInnerHTML={{
          __html: ensureCollapsiblesClosed(
            replaceFormatInstructions(content, state, name  , surveyLang),
          ),
        }}
      />
    );
  }
}

export default React.memo(Content);
