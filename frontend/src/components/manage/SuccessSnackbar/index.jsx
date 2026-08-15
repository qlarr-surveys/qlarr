import React, { useEffect, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { rtlLanguage } from "~/utils/common";

export default function SuccessSnackbar({ success, left }) {
  const [open, setOpen] = useState(true);
  const [dir, setDir] = useState("ltr");
  const { t, i18n } = useTranslation(NAMESPACES.MANAGE);

  useEffect(() => {
    if (rtlLanguage.includes(i18n.language)) {
      setDir("rtl");
    } else {
      setDir("ltr");
    }

    const timer = setTimeout(() => {
      setOpen(false);
    }, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [i18n.language]);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={2000}
      onClose={handleClose}
      sx={{ left: `${left}px !important` }}
    >
      <Alert variant="standard" severity="success" onClose={handleClose} dir={dir}>
        {t(`processed_successes.${success}`)}
      </Alert>
    </Snackbar>
  );
}
