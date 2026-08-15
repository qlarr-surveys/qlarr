import Link from "@tiptap/extension-link";
import { Plugin, PluginKey } from "prosemirror-state";

const LinkExtension = Link.extend({
  addProseMirrorPlugins() {
    return [
      ...this.parent?.() || [],
      new Plugin({
        key: new PluginKey("clearLinkMarkOnDelete"),
        appendTransaction: (transactions, oldState, newState) => {
          const tr = newState.tr;
          let modified = false;

          const hasDeletion = transactions.some(transaction => {
            return transaction.steps.some(step => {
              if (step.stepType === "replace") {
                const stepSlice = step.slice;
                const stepFrom = step.from;
                const stepTo = step.to;
                return stepSlice.size < (stepTo - stepFrom);
              }
              return false;
            });
          });

          if (hasDeletion) {
            const { $from, empty } = newState.selection;
            const linkMark = newState.schema.marks.link;
            
            if (linkMark && empty) {
              const marksAtCursor = $from.marks();
              if (marksAtCursor.some(mark => mark.type === linkMark)) {
                tr.removeStoredMark(linkMark);
                modified = true;
              }
            }
          }

          return modified ? tr : null;
        },
      }),
    ];
  },
});

export default LinkExtension;

