import { Extension } from "@tiptap/core";

const FontSize = Extension.create({
  name: "fontSize",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) =>
              element.style.fontSize?.replace(/['"]+/g, ""),
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) => {
          return chain().setMark("textStyle", { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain, state }) => {
          const textStyleMark = state.selection.$from
            .marks()
            .find((m) => m.type.name === "textStyle");
          if (textStyleMark) {
            const currentAttrs = textStyleMark.attrs || {};
            const { fontSize, ...remainingAttrs } = currentAttrs;

            if (Object.keys(remainingAttrs).length > 0) {
              return chain()
                .extendMarkRange("textStyle")
                .setMark("textStyle", remainingAttrs)
                .run();
            }
          }

          return chain()
            .extendMarkRange("textStyle")
            .unsetMark("textStyle")
            .run();
        },
    };
  },
});

export default FontSize;

