import React, { useRef } from "react";
import { useSelector } from "react-redux";
import "~/styles/tiptap-editor.css";
import { rtlLanguage } from "~/utils/common";
import {
  useCollapsibleHandler,
  ensureCollapsiblesClosed,
} from "~/hooks/useCollapsibleHandler";
import { css } from "@emotion/react";

function Content(props) {
  const contentRef = useRef(null);
  const isComplex = props.content && props.content.includes("{{");
  const content = props.content;
  const name = props.name;
  const elementCode = props.elementCode;
  const customStyle = props.customStyle;
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
            replaceFormatInstructions(content, state, name + "_" + surveyLang),
          ),
        }}
      />
    );
  }
}

export default React.memo(Content);

export function replaceFormatInstructions(html, state, postFix) {
  if(!html){
    return html
  }
  const allMatches = getAllFormatInstructions(html);
  console.log(allMatches);
  allMatches.forEach((match, index) => {
    html = html.replace(match, state[`format_${postFix}_${index + 1}`]);
  });
  return html;
}

const getAllFormatInstructions = (inputString) => {
  const regex = /\{\{(.*?)\}\}/g;
  return Array.from(inputString.matchAll(regex), (m) => m[0]);
};
