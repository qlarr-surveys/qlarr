import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { NodeViewWrapper } from "@tiptap/react";
import AspectRatioIcon from "@mui/icons-material/AspectRatio";
import ImageSizeInput from "./Toolbar/ImageSizeInput";
import { useImageResize } from "./useImageResize";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

const ImageWithResizeButton = ({
  node,
  updateAttributes,
  editor,
  selected,
}) => {
  const { t } = useTranslation(NAMESPACES.DESIGN_EDITOR);
  const wrapperRef = useRef(null);

  const {
    showImageSizeInput,
    setShowImageSizeInput,
    imageWidth,
    imageHeight,
    maintainAspectRatio,
    isEditorActive,
    imageSizeInputRef,
    toggleImageSizeInput,
    handleWidthChange,
    handleHeightChange,
    handleAspectRatioToggle,
    updateImageSize,
  } = useImageResize({
    node,
    updateAttributes,
    editor,
    wrapperRef,
  });

  const attrs = node.attrs;
  const imageSrc = attrs.src || "";
  const imageAlt = attrs.alt || "";
  const imageTitle = attrs.title || "";
  const imageWidthAttr = attrs.width || "";
  const imageHeightAttr = attrs.height || "";

  return (
    <NodeViewWrapper>
      <div
        ref={wrapperRef}
        className="tiptap-image-wrapper"
        data-selected={selected}
      >
        <img
          src={imageSrc}
          alt={imageAlt}
          title={imageTitle}
          width={imageWidthAttr || undefined}
          height={imageHeightAttr || undefined}
          className="tiptap-image"
          draggable="false"
          contentEditable="false"
        />
        {isEditorActive && (
          <button
            className="tiptap-image-resize-button"
            data-image-size-button
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={toggleImageSizeInput}
            title={t("image_size")}
            aria-label={t("image_size")}
            aria-expanded={showImageSizeInput}
          >
            <AspectRatioIcon sx={{ fontSize: "inherit" }} />
          </button>
        )}
        {showImageSizeInput && (
          <div
            className="tiptap-image-size-input-wrapper"
            ref={imageSizeInputRef}
          >
            <ImageSizeInput
              show={showImageSizeInput}
              imageWidth={imageWidth}
              imageHeight={imageHeight}
              maintainAspectRatio={maintainAspectRatio}
              onWidthChange={handleWidthChange}
              onHeightChange={handleHeightChange}
              onAspectRatioToggle={handleAspectRatioToggle}
              onUpdate={updateImageSize}
              onClose={() => setShowImageSizeInput(false)}
              editor={editor}
            />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default ImageWithResizeButton;
