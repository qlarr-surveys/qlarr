import React, { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

const LinkInput = ({
  show,
  linkUrl,
  linkText,
  setLinkUrl,
  setLinkText,
  onSetLink,
  onClose,
  editor,
}) => {
  const { t } = useTranslation(NAMESPACES.DESIGN_EDITOR);
  const { t: tCore } = useTranslation(NAMESPACES.DESIGN_CORE);
  const linkInputRef = useRef(null);

  useEffect(() => {
    if (show) {
      const currentUrl = editor.getAttributes("link").href || "";
      if (currentUrl && !linkUrl) {
        setLinkUrl(currentUrl);
      }
    } else {
      setLinkUrl("");
      setLinkText("");
    }
  }, [show, editor, linkUrl, setLinkUrl, setLinkText]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        linkInputRef.current &&
        !linkInputRef.current.contains(event.target) &&
        !event.target.closest("[data-link-button]")
      ) {
        onClose();
      }
    };

    if (show) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [show, onClose]);

  if (!show) {
    return null;
  }

  return (
    <div className="tiptap-link-input" ref={linkInputRef}>
      <input
        type="text"
        placeholder={t("link_text_placeholder")}
        value={linkText}
        onChange={(e) => setLinkText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (linkText.trim() && linkUrl.trim()) {
              onSetLink();
            } else {
              document
                .querySelector('.tiptap-link-input input[type="url"]')
                ?.focus();
            }
          } else if (e.key === "Escape") {
            e.preventDefault();
            onClose();
            editor.commands.focus();
          }
        }}
        autoFocus
      />
      <input
        type="url"
        placeholder={t("link_placeholder")}
        value={linkUrl}
        onChange={(e) => setLinkUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (linkText.trim() && linkUrl.trim()) {
              onSetLink();
            }
          } else if (e.key === "Escape") {
            e.preventDefault();
            onClose();
            editor.commands.focus();
          }
        }}
      />
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={onSetLink}
        disabled={!linkText.trim() || !linkUrl.trim()}
      >
        {tCore("ok")}
      </button>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          onClose();
          editor.commands.focus();
        }}
      >
        {tCore("cancel")}
      </button>
    </div>
  );
};

export default React.memo(LinkInput);

