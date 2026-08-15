import React from "react";
import "./Toolbar.css";
import { useTranslation } from "react-i18next";
import FontSizeSelector from "./Toolbar/FontSizeSelector";
import LinkInput from "./Toolbar/LinkInput";
import FormatButton from "./Toolbar/FormatButton";
import ColorPickerButton from "./Toolbar/ColorPickerButton";
import ImageUploadButton from "./Toolbar/ImageUploadButton";
import ListControls from "./Toolbar/ListControls";
import { useToolbar } from "./Toolbar/useToolbar";
import { EDITOR_CONSTANTS } from "~/constants/editor";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

const { TOOLBAR_CLASS, TOOLBAR_BUTTON_CLASS } = EDITOR_CONSTANTS;

const Toolbar = ({ editor, extended }) => {
  const { t } = useTranslation(NAMESPACES.DESIGN_EDITOR);

  const {
    // State
    showColorPicker,
    setShowColorPicker,
    showBgColorPicker,
    setShowBgColorPicker,
    showLinkInput,
    setShowLinkInput,
    linkUrl,
    setLinkUrl,
    linkText,
    setLinkText,
    isUploadingImage,
    currentFontSize,
    // Refs
    colorPickerRef,
    bgColorPickerRef,
    // Memoized
    colors,
    // Methods
    setFontSize,
    setLink,
    toggleLink,
    handleImageUpload,
    insertCollapsible,
  } = useToolbar({ editor });

  if (!editor) {
    return null;
  }

  return (
    <div className={TOOLBAR_CLASS}>
      {/* Font Size */}
      <FontSizeSelector
        currentFontSize={currentFontSize}
        setFontSize={setFontSize}
      />

      {/* Bold */}
      <FormatButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title={t("bold")}
      >
        <strong>B</strong>
      </FormatButton>

      {/* Italic */}
      <FormatButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title={t("italic")}
      >
        <em>I</em>
      </FormatButton>

      {/* Underline */}
      <FormatButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title={t("underline")}
      >
        <u>U</u>
      </FormatButton>

      {/* Strike */}
      <FormatButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title={t("strikethrough")}
      >
        <s>S</s>
      </FormatButton>

      {/* Link */}
      <FormatButton
        onClick={toggleLink}
        isActive={editor.isActive("link")}
        title={t("link")}
        data-link-button
      >
        🔗
      </FormatButton>

      <LinkInput
        show={showLinkInput}
        linkUrl={linkUrl}
        linkText={linkText}
        setLinkUrl={setLinkUrl}
        setLinkText={setLinkText}
        onSetLink={setLink}
        onClose={() => {
          setShowLinkInput(false);
          setLinkUrl("");
          setLinkText("");
        }}
        editor={editor}
      />

      {extended && <ListControls editor={editor} />}

      {/* Text Color */}
      <ColorPickerButton
        show={showColorPicker}
        onToggle={setShowColorPicker}
        onColorSelect={(color) => {
          editor.chain().focus().setColor(color).run();
        }}
        onRemove={() => {
          editor.chain().focus().unsetColor().run();
        }}
        removeLabel={t("remove_color")}
        pickerRef={colorPickerRef}
        colors={colors}
        title={t("text_color")}
        indicatorStyle={{
          borderBottom: `3px solid ${
            editor.getAttributes("textStyle").color || "#000000"
          }`,
          display: "inline-block",
          width: "16px",
          height: "16px",
        }}
        indicatorContent="A"
      />

      {/* Background Color */}
      <ColorPickerButton
        show={showBgColorPicker}
        onToggle={setShowBgColorPicker}
        onColorSelect={(color) => {
          editor.chain().focus().toggleHighlight({ color }).run();
        }}
        onRemove={() => {
          editor.chain().focus().unsetHighlight().run();
        }}
        removeLabel={t("remove_background")}
        pickerRef={bgColorPickerRef}
        colors={colors}
        title={t("background_color")}
        indicatorStyle={{
          backgroundColor:
            editor.getAttributes("highlight").color || "transparent",
          display: "inline-block",
          width: "16px",
          height: "16px",
          border: "1px solid #ccc",
        }}
        indicatorContent="&nbsp;"
      />

      {/* Image Upload */}
      <ImageUploadButton
        onImageUpload={handleImageUpload}
        isUploading={isUploadingImage}
      />

      {/* Collapsible/Details */}
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={insertCollapsible}
        className={TOOLBAR_BUTTON_CLASS}
        title={t("insert_collapsible")}
        disabled={editor.isActive("collapsible")}
      >
        <span style={{ fontSize: "12px" }}>▼</span>
      </button>

      {/* Clear Formatting */}
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          editor.chain().focus().clearNodes().unsetAllMarks().unsetLink().run();
          setShowLinkInput(false);
          setLinkUrl("");
        }}
        className={TOOLBAR_BUTTON_CLASS}
        title={t("clear_formatting")}
      >
        🗑
      </button>
    </div>
  );
};

export default Toolbar;
