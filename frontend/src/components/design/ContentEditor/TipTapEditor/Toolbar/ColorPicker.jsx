import React, { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { EDITOR_CONSTANTS } from "~/constants/editor";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

const ColorPicker = ({
  show,
  onClose,
  onColorSelect,
  onRemove,
  removeLabel,
  pickerRef,
  colors,
}) => {
  const { t } = useTranslation(NAMESPACES.DESIGN_EDITOR);
  const internalRef = useRef(null);
  const ref = pickerRef || internalRef;
  const colorPalette = colors || EDITOR_CONSTANTS.COLOR_PALETTE;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        const wrapper = event.target.closest(".tiptap-color-picker-wrapper");
        if (!wrapper) {
          onClose();
        }
      }
    };

    if (show) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [show, onClose, ref]);

  if (!show) {
    return null;
  }

  return (
    <div className="tiptap-color-palette" ref={ref}>
      {colorPalette.map((color) => (
        <button
          key={color}
          className="tiptap-color-option"
          style={{ backgroundColor: color }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onColorSelect(color);
            onClose();
          }}
          title={color}
        />
      ))}
      <button
        className="tiptap-color-option tiptap-color-remove"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          onRemove();
          onClose();
        }}
        title={removeLabel || t("remove_color")}
      >
        ✕
      </button>
    </div>
  );
};

export default React.memo(ColorPicker);

