import React, { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

const ImageSizeInput = ({
  show,
  imageWidth,
  imageHeight,
  maintainAspectRatio,
  onWidthChange,
  onHeightChange,
  onAspectRatioToggle,
  onUpdate,
  onClose,
  editor,
}) => {
  const { t } = useTranslation(NAMESPACES.DESIGN_EDITOR);
  const { t: tCore } = useTranslation(NAMESPACES.DESIGN_CORE);
  const imageSizeInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        imageSizeInputRef.current &&
        !imageSizeInputRef.current.contains(event.target) &&
        !event.target.closest("[data-image-size-button]")
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
    <div className="tiptap-image-size-input" ref={imageSizeInputRef}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            fontSize: "0.75rem",
            cursor: "pointer",
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <input
            type="checkbox"
            checked={maintainAspectRatio}
            onChange={(e) => {
              e.stopPropagation();
              onAspectRatioToggle(e.target.checked);
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            style={{ cursor: "pointer" }}
          />
          <span>{t("maintain_aspect_ratio")}</span>
        </label>

        <div
          style={{
            display: "flex",
            gap: "0.25rem",
            alignItems: "center",
          }}
        >
          <label style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
            {t("width")}:
          </label>
          <input
            type="text"
            placeholder={t("width")}
            value={imageWidth}
            onChange={(e) => onWidthChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onUpdate();
                onClose();
              } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
                editor.commands.focus();
              }
            }}
          />
          <label style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
            {t("height")}:
          </label>
          <input
            type="text"
            placeholder={t("height")}
            value={imageHeight}
            onChange={(e) => onHeightChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onUpdate();
                onClose();
              } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
                editor.commands.focus();
              }
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.25rem",
            justifyContent: "flex-end",
          }}
        >
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onUpdate();
              onClose();
            }}
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
      </div>
    </div>
  );
};

export default React.memo(ImageSizeInput);

