import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { INSTRUCTION_EDITOR_CONFIG } from "~/constants/editor";
import { INSTRUCTION_SYNTAX_PATTERN } from '~/constants/instruction';

const InstructionHighlightExtension = Extension.create({
  name: "instructionHighlight",

  addOptions() {
    return {};
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("instructionHighlight"),
        state: {
          init(_, { doc }) {
            return findInstructionPatterns(doc);
          },
          apply(tr, oldState, oldEditorState, newEditorState) {
            // Only recalculate if document actually changed
            if (!tr.docChanged) {
              return oldState;
            }
            return findInstructionPatterns(newEditorState.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

function findInstructionPatterns(doc) {
  const decorations = [];
  const regex = new RegExp(INSTRUCTION_SYNTAX_PATTERN.source, "g");

  doc.descendants((node, pos) => {
    if (node.isText) {
      const text = node.text;
      let match;

      while ((match = regex.exec(text)) !== null) {
        const fullMatch = match[0];
        const patternStart = pos + match.index;
        const patternEnd = patternStart + fullMatch.length;

        decorations.push(
          Decoration.inline(patternStart, patternEnd, {
            class: INSTRUCTION_EDITOR_CONFIG.SELECTORS.HIGHLIGHT_CLASS,
          }),
        );
      }
    }
  });

  return DecorationSet.create(doc, decorations);
}

export default InstructionHighlightExtension;
