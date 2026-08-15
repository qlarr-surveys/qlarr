import React, { useEffect, useState } from "react";
import styles from "./DynamicSvg.module.css";

function DynamicSvg({
  svgUrl,
  imageHeight,
  maxHeight = "inherit",
  onIconClick,
  opacity = 1,
  isSelected = false,
  inDesign = false,
  theme,
}) {
  const [svgContent, setSvgContent] = useState("");

  useEffect(() => {
    const fetchSvg = async () => {
      const response = await fetch(svgUrl || "/placeholder-image.svg");
      const svgText = await response.text();
      setSvgContent(svgText);
    };
    fetchSvg();
  }, [svgUrl]);

  return (
    <div
      style={{
        opacity: opacity,
        maxHeight: maxHeight,
        maxWidth: maxHeight,
        height: imageHeight,
        cursor : inDesign ? "pointer" : "inherit",
        aspectRatio: "1",
        padding: "2px",
        width: imageHeight,
        margin: "auto",
        borderRadius: "8px",
        color: isSelected
          ? theme.palette.primary.main
          : (theme.textStyles?.text?.color),
        border: isSelected
          ? `4px solid ${theme.palette.primary.main}`
          : "4px solid transparent",
      }}
      onClick={onIconClick}
      className={styles.svgContainer}
      dangerouslySetInnerHTML={{ __html: svgContent ? svgContent : "" }}
    />
  );
}

export default DynamicSvg;
