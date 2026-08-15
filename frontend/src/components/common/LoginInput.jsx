import React from "react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import { styled } from "@mui/material/styles";

const StyledTextField = styled(TextField)(({ theme }) => ({
  "& .MuiInputBase-root": {
    boxSizing: "border-box",
    background: "#eff1fc",
    color: "#16205b",
    padding: "20px",
    borderRadius: "15px",
    "&:before": {
      borderBottom: "none",
    },
    "&:after": {
      borderBottom: "none",
    },
  },
  "& .MuiInputLabel-root": {
    color: "#c2c4cc",
    zIndex: "1",
    top: "58%",
    left: "8%",
    transform: "translate(0, -50%)",
    transition: "transform 0.3s ease",
  },
  "& .MuiInputLabel-root.MuiInputLabel-shrink": {
    transform: "translate(0, -30px) scale(0.75)",
    left: "25px",
    transition: "transform 0.3s ease",
    animation: "labelShake 0.5s ease forwards",
  },
  "& .MuiInputBase-input": {
    color: "#16205b",
  },
  "& .error-helper-text": {
    color: "red",
  },
  "& .MuiFormLabel-asterisk.Mui-error": {
    color: "#c2c4cc",
  },
}));

const LoginInput = ({ icon, value, error, onKeyDown, ...props }) => {
  const inputStyle = error ? { border: "1px solid red" } : {};

  const helperTextStyles = error ? { className: "error-helper-text" } : {};
  return (
    <StyledTextField
      {...props}
      InputProps={{
        ...props.InputProps,
        style: inputStyle,
        endAdornment: icon ? (
          <InputAdornment position="start">{icon}</InputAdornment>
        ) : null,
        disableUnderline: true,
      }}
      autoComplete={props.autoComplete}
      InputLabelProps={{
        ...props.InputLabelProps,
        shrink: true,
      }}
      FormHelperTextProps={helperTextStyles}
      onKeyDown={onKeyDown}
    />
  );
};

export default LoginInput;
