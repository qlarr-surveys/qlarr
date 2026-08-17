import React from "react";
import { useTranslation } from "react-i18next";
import { EDITOR_CONSTANTS } from "~/constants/editor";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

const FontSizeSelector = ({ currentFontSize, setFontSize }) => {
  const { t } = useTranslation(NAMESPACES.DESIGN_EDITOR);

  const fontSizes = [
    {
      label: t("font_size_small"),
      value: EDITOR_CONSTANTS.FONT_SIZE_VALUES[0],
    },
    {
      label: t("font_size_normal"),
      value: EDITOR_CONSTANTS.FONT_SIZE_VALUES[1],
    },
    {
      label: t("font_size_large"),
      value: EDITOR_CONSTANTS.FONT_SIZE_VALUES[2],
    },
    {
      label: t("font_size_huge"),
      value: EDITOR_CONSTANTS.FONT_SIZE_VALUES[3],
    },
  ];

  return (
    <select
      className="tiptap-toolbar-button"
      onChange={(e) => setFontSize(e.target.value)}
      value={currentFontSize}
    >
      {fontSizes.map((size) => (
        <option key={size.value} value={size.value}>
          {size.label}
        </option>
      ))}
    </select>
  );
};

export default React.memo(FontSizeSelector);

