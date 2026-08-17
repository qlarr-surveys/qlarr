import { useCallback, useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useService } from "~/hooks/use-service";
import { buildResourceUrl } from "~/networking/common";
import { EDITOR_CONSTANTS } from "~/constants/editor";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

export const useToolbar = ({ editor }) => {
  const { t } = useTranslation(NAMESPACES.DESIGN_EDITOR);
  const designService = useService("design");

  // State
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState("1em");

  // Refs
  const colorPickerRef = useRef(null);
  const bgColorPickerRef = useRef(null);

  // Memoized values
  const fontSizes = useMemo(
    () => [
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
    ],
    [t]
  );

  const colors = useMemo(() => EDITOR_CONSTANTS.COLOR_PALETTE, []);

  // Methods
  const setFontSize = useCallback(
    (size) => {
      editor?.chain().focus().setFontSize(size).run();
    },
    [editor]
  );

  const setLink = useCallback(() => {
    const trimmedUrl = linkUrl.trim();
    const trimmedText = linkText.trim();

    if (trimmedUrl) {
      let finalUrl = trimmedUrl;
      if (trimmedUrl.match(/^(javascript|data):/i)) {
        alert(t("invalid_link"));
        return;
      }

      if (!trimmedUrl.match(/^https?:\/\//i)) {
        finalUrl = `http://${trimmedUrl}`;
      }

      try {
        new URL(finalUrl);
      } catch (e) {
        alert(t("invalid_link"));
        return;
      }

      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);

      const linkDisplayText = trimmedText || selectedText || finalUrl;

      if (selectedText && selectedText.trim().length > 0) {
        editor
          .chain()
          .focus()
          .deleteSelection()
          .insertContent(`<a href="${finalUrl}">${linkDisplayText}</a>`)
          .run();
      } else if (trimmedText) {
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${finalUrl}">${linkDisplayText}</a>`)
          .run();
      } else {
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: finalUrl })
          .run();
      }
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
    setLinkText("");
  }, [editor, linkUrl, linkText, t]);

  const toggleLink = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href;
    if (previousUrl) {
      const { from, to } = editor.state.selection;
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .unsetLink()
        .removeMark("link")
        .setTextSelection({ from: to, to: to })
        .run();
    } else {
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);

      const currentUrl = editor.getAttributes("link").href || "";
      setLinkUrl(currentUrl);
      setLinkText(selectedText || "");
      setShowLinkInput(true);
    }
  }, [editor]);

  const handleImageUpload = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        alert(t("invalid_file_type"));
        return;
      }

      if (file.size > EDITOR_CONSTANTS.MAX_IMAGE_SIZE) {
        alert(t("file_too_large"));
        return;
      }

      const surveyId = sessionStorage.getItem("surveyId");
      if (!surveyId) {
        alert(t("no_survey_selected"));
        return;
      }

      setIsUploadingImage(true);
      try {
        const response = await designService.uploadResource(file);
        const imageUrl = buildResourceUrl(response.name);
        const { from } = editor.state.selection;

        editor
          .chain()
          .focus()
          .setImage({
            src: imageUrl,
            alt: file.name,
            resourceName: response.name,
          })
          .setTextSelection(from + 1)
          .run();
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Image upload failed:", error);
        }
        let errorMessage = t("upload_failed");

        if (error?.response?.status === 401) {
          errorMessage = t("auth_failed");
        } else if (error?.response?.status === 403) {
          errorMessage = t("no_permission");
        } else if (error?.response?.status === 413) {
          errorMessage = t("file_too_large_upload");
        } else if (error?.response?.status === 400) {
          errorMessage = t("invalid_file");
        } else if (error?.response?.status >= 500) {
          errorMessage = t("server_error");
        } else if (error.code === "ERR_NETWORK") {
          errorMessage = t("network_error");
        }

        alert(errorMessage);
      } finally {
        setIsUploadingImage(false);
      }
    },
    [editor, designService, t]
  );

  const insertCollapsible = useCallback(() => {
    if (editor.isActive("collapsible")) {
      return;
    }

    editor
      .chain()
      .focus()
      .setCollapsible({
        open: false,
        buttonText: t("collapsible_title_placeholder"),
        backgroundColor: null,
        textColor: null,
        content: [
          {
            type: "paragraph",
          },
        ],
      })
      .run();
  }, [editor, t]);

  // Sync editor state with component state
  useEffect(() => {
    if (!editor) return;

    const updateFontSize = () => {
      const attrs = editor.getAttributes("textStyle");
      const fontSize = attrs?.fontSize;
      if (fontSize && fontSizes.some((size) => size.value === fontSize)) {
        setCurrentFontSize(fontSize);
      } else {
        setCurrentFontSize("1em");
      }
    };

    updateFontSize();

    const handleUpdate = () => {
      requestAnimationFrame(() => {
        updateFontSize();
      });
    };

    editor.on("selectionUpdate", handleUpdate);
    editor.on("update", handleUpdate);
    editor.on("transaction", handleUpdate);

    return () => {
      editor.off("selectionUpdate", handleUpdate);
      editor.off("update", handleUpdate);
      editor.off("transaction", handleUpdate);
    };
  }, [editor, fontSizes]);

  // Handle click outside for popups
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target) &&
        !event.target.closest(".tiptap-color-picker-wrapper")
      ) {
        setShowColorPicker(false);
      }
      if (
        bgColorPickerRef.current &&
        !bgColorPickerRef.current.contains(event.target) &&
        !event.target.closest(".tiptap-color-picker-wrapper")
      ) {
        setShowBgColorPicker(false);
      }
    };

    if (showColorPicker || showBgColorPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showColorPicker, showBgColorPicker]);

  return {
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
    fontSizes,
    colors,
    // Methods
    setFontSize,
    setLink,
    toggleLink,
    handleImageUpload,
    insertCollapsible,
  };
};
