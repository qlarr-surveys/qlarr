import { Box, Button } from "@mui/material";
import React from "react";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";


import styles from "./BarcodeDesign.module.css";
import { useTheme } from "@emotion/react";
import { useSelector } from "react-redux";

function BarcodeDesign({ code }) {
  const theme = useTheme();

  const state = useSelector((state) => {
    return state.designState[code];
  });

  const lang = useSelector((state) => {
    return state.designState.langInfo.lang;
  });

  return (
    <Box className={styles.container}>
      <Button
        variant="contained"
        color="primary"
      >
        <QrCodeScannerIcon className={styles.largeIcon} />
      </Button>
      <br />
      {state.showHint && <span>{state.content?.[lang]?.hint || ""}</span>}
    </Box>
  );
}

export default React.memo(BarcodeDesign);
