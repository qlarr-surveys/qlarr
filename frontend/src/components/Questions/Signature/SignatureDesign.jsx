import { Box } from "@mui/material";
import React from "react";

import styles from "./SignatureDesign.module.css";

function SignatureDesign() {
  return (
    <Box
      className={styles.signatureCanvas}
    >
      <img
        src="/signature.png"
        className={styles.signatureImage}
      />
    </Box>
  );
}

export default React.memo(SignatureDesign);
