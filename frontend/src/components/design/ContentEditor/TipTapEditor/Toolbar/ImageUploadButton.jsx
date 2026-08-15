import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import PhotoIcon from "@mui/icons-material/Photo";
import LoadingDots from "~/components/common/LoadingDots";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

const ImageUploadButton = ({ onImageUpload, isUploading }) => {
  const { t } = useTranslation(NAMESPACES.DESIGN_EDITOR);
  const fileInputRef = useRef(null);

  const handleChange = (event) => {
    onImageUpload(event);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div
      style={{ display: "inline-flex" }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <label
        style={{
          display: "inline-flex",
          cursor: isUploading ? "not-allowed" : "pointer",
          margin: 0,
          padding: 0,
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          style={{ display: "none" }}
          disabled={isUploading}
          onClick={(e) => {
            e.stopPropagation();
          }}
        />
        <span
          className="tiptap-toolbar-button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: isUploading ? "none" : "auto",
            opacity: isUploading ? 0.6 : 1,
          }}
          title={t("insert_image")}
        >
          {isUploading ? (
            <LoadingDots />
          ) : (
            <PhotoIcon style={{ fontSize: "16px" }} />
          )}
        </span>
      </label>
    </div>
  );
};

export default React.memo(ImageUploadButton);

