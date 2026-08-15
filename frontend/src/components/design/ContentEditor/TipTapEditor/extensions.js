import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import LinkExtension from "./LinkExtension";
import ImageExtension from "./ImageExtension";
import CollapsibleExtension from "./CollapsibleExtension";
import FontSize from "./FontSizeExtension";
import { createMentionExtension } from "./MentionExtension";
import InstructionHighlightExtension from "./InstructionHighlightExtension";
import { PreventEnterExtension } from "./PreventEnterExtension";
import { EDITOR_CONSTANTS } from "~/constants/editor";

const { PARAGRAPH_MARGIN_STYLE, LINK_CLASS, IMAGE_CLASS } = EDITOR_CONSTANTS;

export function createBaseExtensions(
  extended = true,
  onNewLine = null,
  onBlurListener = null,
  lang = null
) {
  return [
    StarterKit.configure({
      paragraph: {
        HTMLAttributes: {
          style: PARAGRAPH_MARGIN_STYLE,
        },
      },
      heading: false,
      link: false,
    }),
    LinkExtension.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: LINK_CLASS,
      },
      autolink: false,
    }),
    TextStyle,
    FontSize,
    Color,
    Highlight.configure({
      multicolor: true,
    }),
    ImageExtension.configure({
      inline: false,
      allowBase64: false,
      HTMLAttributes: {
        class: IMAGE_CLASS,
      },
    }),
    CollapsibleExtension,
    PreventEnterExtension.configure({
      extended,
      onNewLine,
      onBlurListener,
      lang,
    }),
  ];
}

export function createAllExtensions({
  getMentionSuggestions,
  extended = true,
  onNewLine = null,
  onBlurListener = null,
  lang = null,
}) {
  const baseExtensions = createBaseExtensions(
    extended,
    onNewLine,
    onBlurListener,
    lang
  );
  const mentionExtension = createMentionExtension({getMentionSuggestions});
  const instructionHighlightExtension = InstructionHighlightExtension.configure({});

  return [...baseExtensions, mentionExtension, instructionHighlightExtension];
}
