import tippy from "tippy.js";
import { INSTRUCTION_EDITOR_CONFIG } from '~/constants/editor';

class ReferenceTooltipManager {
  constructor(getContentCallback) {
    this.instances = new Map();
    this.getContentCallback = getContentCallback;
  }

  updateTooltips(editorElement) {
    if (!editorElement) return;

    const currentReferences = new Set(
      editorElement.querySelectorAll(".reference-tooltip")
    );

    // Destroy tooltips for elements that no longer exist
    this.instances.forEach((instance, element) => {
      if (!currentReferences.has(element)) {
        instance.destroy();
        this.instances.delete(element);
      }
    });

    // Create tooltips for new elements
    currentReferences.forEach((element) => {
      if (this.instances.has(element)) return;

      const originalValue = element.getAttribute("data-original");
      if (!originalValue) return;

      const instance = tippy(element, {
        content: "Loading...",
        ...INSTRUCTION_EDITOR_CONFIG.TOOLTIP,
        onShow: (instance) => {
          // Fetch content on demand when tooltip is about to show
          if (this.getContentCallback) {
            const content = this.getContentCallback(originalValue);
            instance.setContent(content || originalValue);
          }
        },
      });

      this.instances.set(element, instance);
    });
  }

  destroy() {
    this.instances.forEach((instance) => {
      instance.destroy();
    });
    this.instances.clear();
  }
}

export default ReferenceTooltipManager;
