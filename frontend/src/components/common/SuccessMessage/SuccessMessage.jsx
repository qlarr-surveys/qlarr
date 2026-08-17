import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { Check } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import styles from "./SuccessMessage.module.css";
const SuccessMessage = ({ message, t }) => {
  const navigate = useNavigate();
  return (
    <Box className={styles.successText}>
      <Box className={styles.iconContainer}>
        <Check
          sx={{
            fontSize: "40px",
            color: "#32CD32",
            stroke: "#32CD32",
            strokeWidth: 1,
          }}
        />
      </Box>
      <Box>
        <Typography variant="h4" color="primary">
          {t("email.check")}
        </Typography>
        <Typography variant="body1" mt={1} color="textSecondary">
          {t(`${message}`)}
        </Typography>
      </Box>
      <Button
        onClick={() => {
          navigate("/login");
        }}
        fullWidth
        size="large"
        color="primary"
        variant="contained"
      >
        {t("login.login")}
      </Button>
    </Box>
  );
};

export default SuccessMessage;
