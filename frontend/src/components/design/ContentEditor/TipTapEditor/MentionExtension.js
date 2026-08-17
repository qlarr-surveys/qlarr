import Mention from "@tiptap/extension-mention";
import suggestion from "./suggestion";

export function createMentionExtension({ getMentionSuggestions }) {
  return Mention.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        instruction: {
          default: null,
          parseHTML: (element) => element.getAttribute("data-instruction"),
          renderHTML: (attributes) => {
            if (!attributes.instruction) {
              return {};
            }
            return {
              "data-instruction": attributes.instruction,
            };
          },
        },
      };
    },

    renderHTML({ node, HTMLAttributes }) {
      return ["span", {"class":"mention"}, `{{${node.attrs.instruction}}}`];
    },
  }).configure({
    suggestion: suggestion(getMentionSuggestions),
  });
}
