import React from "react";
import ColorPicker from "./ColorPicker";

const ColorPickerButton = ({
  show,
  onToggle,
  onColorSelect,
  onRemove,
  removeLabel,
  pickerRef,
  colors,
  title,
  indicatorStyle,
  indicatorContent,
}) => {
  return (
    <div className="tiptap-color-picker-wrapper">
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onToggle(!show)}
        className="tiptap-toolbar-button"
        title={title}
      >
        <span style={indicatorStyle}>{indicatorContent}</span>
      </button>
      <ColorPicker
        show={show}
        onClose={() => onToggle(false)}
        onColorSelect={onColorSelect}
        onRemove={onRemove}
        removeLabel={removeLabel}
        pickerRef={pickerRef}
        colors={colors}
      />
    </div>
  );
};

export default React.memo(ColorPickerButton);
