import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { primary } from "~/theme/palette";
import { EDITOR_CONSTANTS } from "~/constants/editor";

const { COLLAPSIBLE_CLASS } = EDITOR_CONSTANTS;

const CollapsibleExtension = Node.create({
  name: "collapsible",

  group: "block",

  content: "block+",

  addAttributes() {
    return {
      open: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-open") === "true",
        renderHTML: (attributes) => {
          return {
            "data-open": attributes.open ? "true" : "false",
          };
        },
      },
      buttonText: {
        default: "Show more details",
        parseHTML: (element) => {
          const button = element.querySelector(".collapsible-button");
          return (
            button?.getAttribute("data-button-text") || "Show more details"
          );
        },
        renderHTML: (attributes) => {
          return {};
        },
      },
      backgroundColor: {
        default: null,
        parseHTML: (element) => {
          const button = element.querySelector(".collapsible-button");
          return button?.style?.backgroundColor || null;
        },
        renderHTML: (attributes) => {
          return {};
        },
      },
      textColor: {
        default: null,
        parseHTML: (element) => {
          const button = element.querySelector(".collapsible-button");
          return button?.style?.color || null;
        },
        renderHTML: (attributes) => {
          return {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="collapsible"]',
        // Use content selector to only parse from .collapsible-content
        // This tells Tiptap to ignore the button and only parse the content div
        content: ".collapsible-content",
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const isOpen = node.attrs.open;
    const buttonText = node.attrs.buttonText || "Show more details";
    const backgroundColor = node.attrs.backgroundColor;
    const textColor = node.attrs.textColor;

    // Always apply styles: use custom colors if set, otherwise use theme defaults
    const styles = [];
    styles.push(`background-color: ${backgroundColor || primary.main}`);
    styles.push(`color: ${textColor || primary.contrastText}`);
    const buttonStyle = { style: styles.join("; ") };

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "collapsible",
        "data-open": isOpen ? "true" : "false",
        class: COLLAPSIBLE_CLASS,
      }),
      [
        "button",
        mergeAttributes(
          {
            class: "collapsible-button",
            type: "button",
            "data-button-text": buttonText,
            contenteditable: "false",
          },
          buttonStyle
        ),
        buttonText,
      ],
      [
        "div",
        {
          class: `collapsible-content ${isOpen ? "open" : ""}`,
          style: isOpen ? "" : "display: none;",
        },
        0,
      ],
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement("div");
      dom.setAttribute("data-type", "collapsible");
      dom.className = COLLAPSIBLE_CLASS;
      dom.setAttribute("data-open", node.attrs.open ? "true" : "false");

      const button = document.createElement("button");
      button.className = "collapsible-button";
      button.type = "button";
      button.setAttribute("contenteditable", "false");

      // Create text span for button text
      const buttonTextSpan = document.createElement("span");
      buttonTextSpan.className = "collapsible-button-text";
      buttonTextSpan.textContent = node.attrs.buttonText || "Show more details";

      // Create settings button (placed after arrow which is CSS ::after)
      const settingsButton = document.createElement("button");
      settingsButton.className = "collapsible-settings-button";
      settingsButton.type = "button";
      settingsButton.setAttribute("contenteditable", "false");
      settingsButton.innerHTML = "⚙️";
      settingsButton.title = "Collapsible Settings";

      button.appendChild(buttonTextSpan);
      button.appendChild(settingsButton);

      // Apply background color: custom or theme default
      if (node.attrs.backgroundColor) {
        button.style.backgroundColor = node.attrs.backgroundColor;
      } else {
        // Use theme primary color as default
        button.style.backgroundColor = "#16205b";
      }

      // Apply text color: custom or theme contrast text default
      if (node.attrs.textColor) {
        button.style.color = node.attrs.textColor;
      } else {
        // Use theme contrast text as default
        button.style.color = "#ffffff";
      }

      const content = document.createElement("div");
      content.className = "collapsible-content";
      if (node.attrs.open) {
        content.classList.add("open");
      } else {
        content.style.display = "none";
      }

      const contentWrapper = document.createElement("div");
      content.appendChild(contentWrapper);

      const handleClick = (e) => {
        if (e.target.closest(".collapsible-settings-button")) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        const currentPos = typeof getPos === "function" ? getPos() : null;
        if (currentPos !== null && currentPos !== undefined) {
          // Read current state from the editor state, not from the closure
          editor.commands.command(({ tr, state, dispatch }) => {
            const nodePos = currentPos;
            const nodeAtPos = tr.doc.nodeAt(nodePos);
            if (nodeAtPos && nodeAtPos.type.name === this.name) {
              // Get current open state from the node in the transaction
              const currentOpen = nodeAtPos.attrs.open;
              if (dispatch) {
                tr.setNodeMarkup(nodePos, undefined, {
                  ...nodeAtPos.attrs,
                  open: !currentOpen,
                });
              }
              return true;
            }
            return false;
          });
        }
      };

      const handleSettingsClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currentPos = typeof getPos === "function" ? getPos() : null;
        if (currentPos !== null && currentPos !== undefined) {
          const nodeAtPos = editor.state.doc.nodeAt(currentPos);
          if (nodeAtPos && nodeAtPos.type.name === this.name) {
            // Dispatch custom event with collapsible info
            const rect = settingsButton.getBoundingClientRect();
            const event = new CustomEvent("collapsible-settings-click", {
              detail: {
                pos: currentPos,
                attrs: nodeAtPos.attrs,
                buttonRect: {
                  top: rect.top,
                  left: rect.left,
                  right: rect.right,
                  bottom: rect.bottom,
                  width: rect.width,
                  height: rect.height,
                },
              },
              bubbles: true,
            });
            settingsButton.dispatchEvent(event);
          }
        }
      };

      button.addEventListener("click", handleClick);
      settingsButton.addEventListener("click", handleSettingsClick);

      dom.appendChild(button);
      dom.appendChild(content);

      return {
        dom,
        contentDOM: contentWrapper,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) {
            return false;
          }

          const newButtonText =
            updatedNode.attrs.buttonText || "Show more details";
          buttonTextSpan.textContent = newButtonText;
          button.setAttribute("data-button-text", newButtonText);

          // Update background color: custom or theme default
          if (updatedNode.attrs.backgroundColor) {
            button.style.backgroundColor = updatedNode.attrs.backgroundColor;
          } else {
            // Use theme primary color as default
            button.style.backgroundColor = "#16205b";
          }

          // Update text color: custom or theme contrast text default
          if (updatedNode.attrs.textColor) {
            button.style.color = updatedNode.attrs.textColor;
          } else {
            // Use theme contrast text as default
            button.style.color = "#ffffff";
          }

          const isOpen = updatedNode.attrs.open;
          dom.setAttribute("data-open", isOpen ? "true" : "false");
          if (isOpen) {
            content.style.display = "";
            content.classList.add("open");
          } else {
            content.style.display = "none";
            content.classList.remove("open");
          }

          return true;
        },
      };
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("removeButtonTextFromContent"),
        appendTransaction: (transactions, oldState, newState) => {
          // Remove button text from content if it appears as a paragraph
          const tr = newState.tr;
          let modified = false;

          newState.doc.descendants((node, pos) => {
            if (node.type.name === "collapsible") {
              const buttonText = node.attrs.buttonText || "Show more details";

              // Walk through the direct children of this collapsible
              node.forEach((childNode, offset) => {
                if (childNode.type.name === "paragraph") {
                  // Check if paragraph content matches button text
                  const paragraphText = childNode.textContent?.trim();
                  if (paragraphText === buttonText) {
                    // Remove paragraph that matches button text
                    const paraPos = pos + offset + 1;
                    try {
                      tr.delete(paraPos, paraPos + childNode.nodeSize);
                      modified = true;
                    } catch (e) {
                      // Ignore if deletion fails
                    }
                  }
                }
              });
            }
          });

          return modified ? tr : null;
        },
      }),
    ];
  },

  addCommands() {
    return {
      setCollapsible:
        (options) =>
        ({ commands, state }) => {
          // Get the current selection to see if there's selected text
          const { selection } = state;
          const { $from, $to } = selection;
          const selectedText = state.doc.textBetween($from.pos, $to.pos);
          const buttonText = options?.buttonText || "Show more details";

          // If there's selected text, use it as content, but exclude if it matches buttonText
          let content = options?.content;
          if (!content) {
            if (selectedText.trim() && selectedText.trim() !== buttonText) {
              // Use selected text as content only if it's different from buttonText
              content = [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: selectedText,
                    },
                  ],
                },
              ];
            } else {
              // Empty paragraph
              content = [
                {
                  type: "paragraph",
                },
              ];
            }
          }

          return commands.insertContent({
            type: this.name,
            attrs: {
              open: options?.open ?? false,
              buttonText: buttonText,
              backgroundColor: options?.backgroundColor || null,
              textColor: options?.textColor || null,
            },
            content: content,
          });
        },
      updateCollapsible:
        (options) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { $from } = selection;
          let node = $from.node();
          let pos = $from.pos;

          if (node.type.name !== this.name) {
            for (let i = $from.depth; i > 0; i--) {
              const nodeAtDepth = $from.node(i);
              if (nodeAtDepth.type.name === this.name) {
                node = nodeAtDepth;
                pos = $from.before(i);
                break;
              }
            }
          }

          if (node && node.type.name === this.name) {
            if (dispatch) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                ...options,
              });
            }
            return true;
          }
          return false;
        },
      toggleCollapsible:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { $from } = selection;
          let node = $from.node();
          let pos = $from.pos;

          if (node.type.name !== this.name) {
            for (let i = $from.depth; i > 0; i--) {
              const nodeAtDepth = $from.node(i);
              if (nodeAtDepth.type.name === this.name) {
                node = nodeAtDepth;
                pos = $from.before(i);
                break;
              }
            }
          }

          if (node && node.type.name === this.name) {
            if (dispatch) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                open: !node.attrs.open,
              });
            }
            return true;
          }
          return false;
        },
    };
  },
});

export default CollapsibleExtension;
