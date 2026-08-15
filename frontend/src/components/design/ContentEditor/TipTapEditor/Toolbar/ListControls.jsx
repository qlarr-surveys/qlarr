import React from "react";
import { useTranslation } from "react-i18next";
import FormatButton from "./FormatButton";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

const ListControls = ({ editor }) => {
  const { t } = useTranslation(NAMESPACES.DESIGN_EDITOR);

  return (
    <>
      <FormatButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title={t("ordered_list")}
      >
        1.
      </FormatButton>

      <FormatButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title={t("bullet_list")}
      >
        •
      </FormatButton>

      <FormatButton
        onClick={() => editor.chain().focus().liftListItem("listItem").run()}
        isActive={false}
        title={t("decrease_indent")}
        disabled={!editor.can().liftListItem("listItem")}
      >
        ◂
      </FormatButton>

      <FormatButton
        onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
        isActive={false}
        title={t("increase_indent")}
        disabled={!editor.can().sinkListItem("listItem")}
      >
        ▸
      </FormatButton>
    </>
  );
};

export default React.memo(ListControls);

