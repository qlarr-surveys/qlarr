import React from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

import styles from "./ValidationItem.module.css";
import { ErrorOutlineOutlined } from "@mui/icons-material";
import { Box } from "@mui/material";
import Content from "../Content";
import { useTheme } from '@emotion/react';

function ValidationItem({ name, validation, componentCode, content }) {
  const theme = useTheme();
  if (content && validation?.isCustomErrorActive !== false) {
    return (
      <Box sx={{ color: "error.main", fontSize: `${theme.textStyles.text.size}px` }} className={styles.wrapper}>
        <ErrorOutlineOutlined sx={{ fontSize: "inherit" }} />
        <Content name={name} elementCode={componentCode} content={content} />
      </Box>
    );
  } else {
    const { t } = useTranslation(NAMESPACES.RUN);
    var translationKey = name.replace(/[0-9]/g, "");
    const validationMessage = t(translationKey, { ...validation });
    if (validationMessage) {
      return (
        <Box sx={{ color: "error.main", fontSize: `${theme.textStyles.text.size}px` }} className={styles.wrapper}>
          <ErrorOutlineOutlined sx={{ fontSize: "inherit" }} />
          {validationMessage}
        </Box>
      );
    } else {
      return <></>;
    }
  }
}

export default ValidationItem;
