import { useState, useRef, useEffect, useCallback } from "react";

const debounce = (func, wait) => {
  let timeout;
  const debounced = function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
  debounced.cancel = () => {
    clearTimeout(timeout);
  };
  return debounced;
};

export const useImageResize = ({
  node,
  updateAttributes,
  editor,
  wrapperRef,
}) => {
  const [showImageSizeInput, setShowImageSizeInput] = useState(false);
  const [imageWidth, setImageWidth] = useState("");
  const [imageHeight, setImageHeight] = useState("");
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [isEditorActive, setIsEditorActive] = useState(false);
  const imageSizeInputRef = useRef(null);
  const aspectRatioRef = useRef(null);

  const getImageElement = useCallback(() => {
    if (!wrapperRef.current) return null;
    return wrapperRef.current.querySelector("img");
  }, [wrapperRef]);

  const getNaturalAspectRatio = useCallback(() => {
    const imageElement = getImageElement();
    if (
      imageElement &&
      imageElement.naturalWidth &&
      imageElement.naturalHeight
    ) {
      return imageElement.naturalWidth / imageElement.naturalHeight;
    }
    return null;
  }, [getImageElement]);

  const getImageDimensions = useCallback(() => {
    const attrs = node.attrs;
    let width = attrs.width || "";
    let height = attrs.height || "";

    if (!width || !height) {
      const imageElement = getImageElement();
      if (imageElement) {
        if (!width) {
          const renderedWidth =
            imageElement.offsetWidth || imageElement.naturalWidth || 0;
          width = renderedWidth > 0 ? renderedWidth.toString() : "";
        }
        if (!height) {
          const renderedHeight =
            imageElement.offsetHeight || imageElement.naturalHeight || 0;
          height = renderedHeight > 0 ? renderedHeight.toString() : "";
        }
      }
    }

    const naturalRatio = getNaturalAspectRatio();
    if (naturalRatio) {
      aspectRatioRef.current = naturalRatio;
    } else if (width && height) {
      const widthNum = parseFloat(width);
      const heightNum = parseFloat(height);
      if (widthNum > 0 && heightNum > 0) {
        aspectRatioRef.current = widthNum / heightNum;
      }
    }

    return { width, height };
  }, [node.attrs, getImageElement, getNaturalAspectRatio]);

  const updateImageSize = useCallback(() => {
    const attrs = {};
    const trimmedWidth = imageWidth.trim();
    const trimmedHeight = imageHeight.trim();

    attrs.width =
      trimmedWidth && !isNaN(parseFloat(trimmedWidth)) ? trimmedWidth : null;
    attrs.height =
      trimmedHeight && !isNaN(parseFloat(trimmedHeight)) ? trimmedHeight : null;

    updateAttributes(attrs);

    if (editor && !editor.isDestroyed) {
      requestAnimationFrame(() => {
        if (!editor.isDestroyed) {
          editor.commands.focus();
        }
      });
    }
  }, [imageWidth, imageHeight, updateAttributes, editor]);

  const toggleImageSizeInput = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const { width, height } = getImageDimensions();
      setImageWidth(width);
      setImageHeight(height);
      setShowImageSizeInput((prev) => !prev);
    },
    [getImageDimensions]
  );

  const handleWidthChange = useCallback(
    (value) => {
      setImageWidth(value);
      if (maintainAspectRatio && aspectRatioRef.current) {
        const widthNum = parseFloat(value);
        if (!isNaN(widthNum) && widthNum > 0) {
          const newHeight = Math.round(widthNum / aspectRatioRef.current);
          setImageHeight(newHeight.toString());
        }
      }
    },
    [maintainAspectRatio]
  );

  const handleHeightChange = useCallback(
    (value) => {
      setImageHeight(value);
      if (maintainAspectRatio && aspectRatioRef.current) {
        const heightNum = parseFloat(value);
        if (!isNaN(heightNum) && heightNum > 0) {
          const newWidth = Math.round(heightNum * aspectRatioRef.current);
          setImageWidth(newWidth.toString());
        }
      }
    },
    [maintainAspectRatio]
  );

  const handleAspectRatioToggle = useCallback(
    (checked) => {
      setMaintainAspectRatio(checked);

      if (!checked) {
        const currentHeight = imageHeight?.trim();
        if (
          !currentHeight ||
          currentHeight === "" ||
          isNaN(parseFloat(currentHeight))
        ) {
          const { height } = getImageDimensions();
          if (height && height.trim() !== "") {
            setImageHeight(height);
          } else {
            const imageElement = getImageElement();
            if (imageElement) {
              const renderedHeight =
                imageElement.offsetHeight || imageElement.naturalHeight || 0;
              if (renderedHeight > 0) {
                setImageHeight(renderedHeight.toString());
              }
            }
          }
        }
      } else {
        const naturalRatio = getNaturalAspectRatio();
        if (naturalRatio) {
          aspectRatioRef.current = naturalRatio;
        } else {
          const widthNum = parseFloat(imageWidth);
          const heightNum = parseFloat(imageHeight);
          if (
            !isNaN(widthNum) &&
            !isNaN(heightNum) &&
            widthNum > 0 &&
            heightNum > 0
          ) {
            aspectRatioRef.current = widthNum / heightNum;
          } else {
            const { width, height } = getImageDimensions();
            const w = parseFloat(width);
            const h = parseFloat(height);
            if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
              aspectRatioRef.current = w / h;
            }
          }
        }
      }
    },
    [
      imageWidth,
      imageHeight,
      getImageDimensions,
      getNaturalAspectRatio,
      getImageElement,
    ]
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        imageSizeInputRef.current &&
        !imageSizeInputRef.current.contains(event.target) &&
        !event.target.closest(".tiptap-image-resize-button")
      ) {
        setShowImageSizeInput(false);
      }
    };

    if (showImageSizeInput) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showImageSizeInput]);

  useEffect(() => {
    const imageElement = getImageElement();
    if (imageElement) {
      const handleLoad = () => {
        const ratio = getNaturalAspectRatio();
        if (ratio) {
          aspectRatioRef.current = ratio;
        }
      };

      if (imageElement.complete) {
        handleLoad();
      } else {
        imageElement.addEventListener("load", handleLoad);
        return () => {
          imageElement.removeEventListener("load", handleLoad);
        };
      }
    }
  }, [getImageElement, getNaturalAspectRatio]);

  useEffect(() => {
    if (!showImageSizeInput) {
      const { width, height } = getImageDimensions();
      setImageWidth(width);
      setImageHeight(height);
    }
  }, [
    node.attrs.width,
    node.attrs.height,
    showImageSizeInput,
    getImageDimensions,
  ]);

  useEffect(() => {
    if (!editor) return;

    const checkEditorActive = () => {
      const isFocused = editor.isFocused;

      const editorElement = editor.view.dom;
      const activeElement = document.activeElement;
      const isActiveElementInEditor =
        editorElement &&
        activeElement &&
        (editorElement === activeElement ||
          editorElement.contains(activeElement));

      const isActive = isFocused || isActiveElementInEditor;
      setIsEditorActive(isActive);
    };

    checkEditorActive();

    const editorElement = editor.view.dom;
    const handleFocus = () => {
      setIsEditorActive(true);
    };

    const handleBlur = () => {
      setTimeout(() => {
        checkEditorActive();
      }, 0);
    };

    editorElement.addEventListener("focus", handleFocus, true);
    editorElement.addEventListener("blur", handleBlur, true);

    const handler = () => {
      requestAnimationFrame(() => {
        checkEditorActive();
      });
    };
    const debouncedCheckActive = debounce(handler, 100);

    editor.on("selectionUpdate", debouncedCheckActive);
    editor.on("update", debouncedCheckActive);

    return () => {
      editorElement.removeEventListener("focus", handleFocus, true);
      editorElement.removeEventListener("blur", handleBlur, true);
      editor.off("selectionUpdate", debouncedCheckActive);
      editor.off("update", debouncedCheckActive);
      if (
        debouncedCheckActive &&
        typeof debouncedCheckActive.cancel === "function"
      ) {
        debouncedCheckActive.cancel();
      }
    };
  }, [editor]);

  return {
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
  };
};
