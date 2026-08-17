import { Box, Button } from "@mui/material";
import React from "react";
import VideocamIcon from "@mui/icons-material/Videocam";

import styles from "./VideoCaptureDesign.module.css";
import { useTheme } from "@emotion/react";
import { useSelector } from "react-redux";

function VideoCaptureDesign({ code }) {
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
        <VideocamIcon className={styles.largeIcon} />
      </Button>
      <br />
      {state.showHint && <span>{state.content?.[lang]?.hint || ""}</span>}
    </Box>
  );
}

export default React.memo(VideoCaptureDesign);
