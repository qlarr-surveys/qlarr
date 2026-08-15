import React, { useEffect, useState } from "react";
import { useTheme } from "@emotion/react";
import { useSelector } from 'react-redux';
import styles from "./LoadingDots.module.css";
import { Box } from "@mui/material";

function RunLoadingDots() {
  const theme = useTheme();
  const isLoading = useSelector((state) => state.templateState.isLoading);
  const [delayedLoading, setDelayedLoading] = useState(false);
  const [forceLoading, setForceLoading] = useState(false);

  useEffect(() => {
    let timer;
    if (isLoading) {
      setDelayedLoading(true);
      setForceLoading(false);
      timer = setTimeout(() => {
        setForceLoading(true);
      }, 200);
    } else {
      if (!forceLoading) {
        timer = setTimeout(() => {
          setDelayedLoading(false);
        }, 200);
      } else {
        setDelayedLoading(false);
      }
    }

    return () => clearTimeout(timer);
  }, [isLoading, forceLoading]);

  return delayedLoading ? <Box className={styles.loadingWrapper}>
    <Box
      style={{
        background: `radial-gradient(circle closest-side, ${theme?.palette?.primary?.main} 90%, #0000) 0 / calc(100% / 3) 100% space`,
      }}
      className={styles.loadingDots}
    ></Box>
  </Box> : <></>;
}

export default RunLoadingDots;
