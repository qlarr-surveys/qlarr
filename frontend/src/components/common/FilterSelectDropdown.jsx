// SelectDropdown.js
import React, { useState, useTransition } from "react";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { KeyboardArrowDown } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

function CustomArrow(props) {
  return (
    <KeyboardArrowDown
      {...props}
      style={{
        color: "#181735",
      }}
    />
  );
}

const FilterSelectDropdown = ({
  label,
  options,
  value,
  onChange,
  sx,
  className,
}) => {
  const { t } = useTranslation(NAMESPACES.MANAGE);

  return (
    <FormControl
      flex="auto"
      className={className}
      fullWidth
      sx={{ ...sx, width: "100px", flex: "auto" }}
    >
      <InputLabel
        sx={{
          color: "#181735",
          fontWeight: "500",
          ...sx?.label,
        }}
      >
        {label}
      </InputLabel>
      <Select
        labelId={`${label}-select-label`}
        id={`${label}-select`}
        label={label}
        displayEmpty
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        sx={{
          borderRadius: "12px",
          "& .MuiOutlinedInput-notchedOutline": {
            border: "1px solid #d7d7d7",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            border: "1px solid #181735",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#181735",
          },
          "& .MuiOutlinedInput-input": {
            padding: ".5rem",
          },
          ...sx?.select,
        }}
        IconComponent={CustomArrow}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {t(option.label)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default FilterSelectDropdown;
