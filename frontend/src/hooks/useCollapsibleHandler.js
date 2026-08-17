import { useEffect } from "react";

export function useCollapsibleHandler(contentRef, content) {
  useEffect(() => {
    if (!contentRef.current) {
      return;
    }

    const handleCollapsibleClick = (e) => {
      const button = e.target.closest(".collapsible-button");
      if (!button) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const collapsible = button.closest(".tiptap-collapsible");
      if (!collapsible) {
        return;
      }

      const contentElement = collapsible.querySelector(".collapsible-content");
      if (!contentElement) {
        return;
      }

      const isOpen = collapsible.getAttribute("data-open") === "true";
      const newState = !isOpen;

      collapsible.setAttribute("data-open", newState ? "true" : "false");

      if (newState) {
        contentElement.style.display = "";
        contentElement.classList.add("open");
      } else {
        contentElement.style.display = "none";
        contentElement.classList.remove("open");
      }
    };

    const element = contentRef.current;
    element.addEventListener("click", handleCollapsibleClick);

    return () => {
      element.removeEventListener("click", handleCollapsibleClick);
    };
  }, [contentRef, content]);
}

export function ensureCollapsiblesClosed(html) {
  if (!html || typeof html !== "string") {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const collapsibles = doc.querySelectorAll(".tiptap-collapsible");

  collapsibles.forEach((collapsible) => {
    collapsible.setAttribute("data-open", "false");

    const contentElement = collapsible.querySelector(".collapsible-content");
    if (contentElement) {
      contentElement.classList.remove("open");
      contentElement.style.display = "none";
    }
  });

  return doc.body.innerHTML;
}
