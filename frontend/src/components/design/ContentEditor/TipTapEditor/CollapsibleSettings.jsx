import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import ColorPicker from "./Toolbar/ColorPicker";
import { EDITOR_CONSTANTS } from "~/constants/editor";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

const CollapsibleSettings = ({
  show,
  position,
  collapsibleAttrs,
  onUpdate,
  onClose,
  editor,
}) => {
  const { t } = useTranslation(NAMESPACES.DESIGN_EDITOR);
  const { t: tCore } = useTranslation(NAMESPACES.DESIGN_CORE);
  const popupRef = useRef(null);
  const colorPickerRef = useRef(null);
  const textColorPickerRef = useRef(null);

  const [title, setTitle] = useState("");
  const [bgColor, setBgColor] = useState("");
  const [textColor, setTextColor] = useState("");
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);

  const colors = useMemo(() => EDITOR_CONSTANTS.COLOR_PALETTE, []);

  // Initialize state from attrs when showing
  useEffect(() => {
    if (show && collapsibleAttrs) {
      setTitle(
        collapsibleAttrs.buttonText || t("collapsible_title_placeholder")
      );
      setBgColor(collapsibleAttrs.backgroundColor || "");
      setTextColor(collapsibleAttrs.textColor || "");
    }
  }, [show, collapsibleAttrs, t]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target) &&
        !event.target.closest(".collapsible-settings-button")
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

  const handleUpdate = useCallback(() => {
    const attrs = {};
    if (title.trim()) {
      attrs.buttonText = title.trim();
    }
    attrs.backgroundColor = bgColor.trim() || null;
    attrs.textColor = textColor.trim() || null;
    onUpdate(attrs);
  }, [title, bgColor, textColor, onUpdate]);

  if (!show || !position) {
    return null;
  }

  const popupContent = (
    <div
      ref={popupRef}
      className="tiptap-collapsible-settings-popup"
      style={{
        position: "fixed",
        top: position.bottom + 4,
        left: position.left,
        zIndex: 10000,
      }}
    >
      <div className="tiptap-collapsible-settings-content">
        <div className="tiptap-collapsible-settings-field">
          <label>{t("title")}:</label>
          <input
            type="text"
            placeholder={t("collapsible_title_placeholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleUpdate();
                onClose();
              } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
                editor?.commands.focus();
              }
            }}
          />
        </div>

        <div className="tiptap-collapsible-settings-field">
          <label>{t("background_color")}:</label>
          <div className="tiptap-collapsible-settings-color-row">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowBgColorPicker(!showBgColorPicker)}
              className="tiptap-toolbar-button"
              style={{
                backgroundColor: bgColor || "#16205b",
                color: "white",
                border: "1px solid #ccc",
                minWidth: "80px",
              }}
              title={t("background_color")}
            >
              {bgColor ? "✓" : t("default")}
            </button>
            {showBgColorPicker && (
              <div className="tiptap-collapsible-settings-color-picker">
                <ColorPicker
                  show={showBgColorPicker}
                  onClose={() => setShowBgColorPicker(false)}
                  onColorSelect={(color) => setBgColor(color)}
                  onRemove={() => setBgColor("")}
                  removeLabel={t("remove_color")}
                  pickerRef={colorPickerRef}
                  colors={colors}
                />
              </div>
            )}
          </div>
        </div>

        <div className="tiptap-collapsible-settings-field">
          <label>{t("title_color")}:</label>
          <div className="tiptap-collapsible-settings-color-row">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowTextColorPicker(!showTextColorPicker)}
              className="tiptap-toolbar-button"
              style={{
                backgroundColor: textColor || "white",
                color: "#000",
                border: "1px solid #ccc",
                minWidth: "80px",
              }}
              title={t("title_color")}
            >
              {textColor ? "✓" : t("default")}
            </button>
            {showTextColorPicker && (
              <div className="tiptap-collapsible-settings-color-picker">
                <ColorPicker
                  show={showTextColorPicker}
                  onClose={() => setShowTextColorPicker(false)}
                  onColorSelect={(color) => setTextColor(color)}
                  onRemove={() => setTextColor("")}
                  removeLabel={t("remove_color")}
                  pickerRef={textColorPickerRef}
                  colors={colors}
                />
              </div>
            )}
          </div>
        </div>

        <div className="tiptap-collapsible-settings-actions">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              handleUpdate();
              onClose();
            }}
          >
            {tCore("ok")}
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onClose();
              editor?.commands.focus();
            }}
          >
            {tCore("cancel")}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(popupContent, document.body);
};

export default React.memo(CollapsibleSettings);
