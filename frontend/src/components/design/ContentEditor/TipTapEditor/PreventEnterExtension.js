import { Extension } from "@tiptap/core";
import { PREVENT_ENTER_EXTENSION } from "~/constants/editor";

const { NAME, LOG_PREFIX, ERROR_MESSAGES } = PREVENT_ENTER_EXTENSION;

export const PreventEnterExtension = Extension.create({
  name: NAME,

  addOptions() {
    return {
      extended: true,
      onNewLine: null,
      onBlurListener: null,
      lang: null,
    };
  },

  addKeyboardShortcuts() {
    const shortcuts = {};

    const isChoiceOption =
      !this.options.extended && typeof this.options.onNewLine === "function";

    if (isChoiceOption) {
      const handleEnterKey = async () => {
        if (!this.editor.isEmpty) {
          const html = this.editor.getHTML();
          if (
            typeof this.options.onBlurListener === "function" &&
            this.options.lang
          ) {
            try {
              const result = this.options.onBlurListener(
                html,
                this.options.lang
              );
              if (result instanceof Promise) {
                await result;
              }
            } catch (error) {
              console.error(LOG_PREFIX, ERROR_MESSAGES.SAVING_CONTENT, error);
            }
          }

          try {
            this.options.onNewLine();
          } catch (error) {
            console.error(LOG_PREFIX, ERROR_MESSAGES.NEW_LINE_CALLBACK, error);
          }
        }

        return true;
      };

      shortcuts.Enter = handleEnterKey;
      shortcuts["Shift-Enter"] = handleEnterKey;
    } else if (!this.options.extended) {
      shortcuts.Enter = () => true;
      shortcuts["Shift-Enter"] = () => true;
    }

    return shortcuts;
  },
});
