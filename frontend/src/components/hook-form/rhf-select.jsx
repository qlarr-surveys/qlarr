import PropTypes from "prop-types";
import { Controller, useFormContext } from "react-hook-form";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Select from "@mui/material/Select";
import Checkbox from "@mui/material/Checkbox";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import React from "react";

// ----------------------------------------------------------------------

export function RHFSelect({
  name,
  native,
  maxHeight = 220,
  helperText,
  children,
  PaperPropsSx,
  label,
  onChange,
  value,
  backgroundColor,
  ...other
}) {
  const context = useFormContext();
  if (!context) {
    return (
      <FormControl fullWidth {...other}>
        <InputLabel>{label}</InputLabel>
        <Select
          value={value ?? ""}
          sx={{
            backgroundColor,
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
          }}
          onChange={onChange}
          label={label}
        >
          {React.Children.map(children, (child, index) => (
            <MenuItem key={index} value={child.props.value}>
              {child.props.children}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>{helperText}</FormHelperText>
      </FormControl>
    );
  }

  const { control } = context;
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl fullWidth {...field}>
          <InputLabel>{label}</InputLabel>
          <Select
            {...field}
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
            }}
            error={!!error}
            label={label}
            {...other}
          >
            {React.Children.map(children, (child, index) => (
              <MenuItem key={index} value={child.props.value}>
                {child.props.children}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>{helperText}</FormHelperText>
        </FormControl>
      )}
    />
  );
}

RHFSelect.propTypes = {
  PaperPropsSx: PropTypes.object,
  children: PropTypes.node,
  helperText: PropTypes.object,
  maxHeight: PropTypes.number,
  name: PropTypes.string,
  native: PropTypes.bool,
};

// ----------------------------------------------------------------------

export function RHFMultiSelect({
  name,
  chip,
  label,
  options,
  checkbox,
  placeholder,
  helperText,
  isOptionDisabled,
  ...other
}) {
  const { control } = useFormContext();

  const renderValues = (selectedIds) => {
    const selectedItems = options.filter((item) =>
      selectedIds.includes(item.value)
    );

    if (!selectedItems.length && placeholder) {
      return <Box sx={{ color: "text.disabled" }}>{placeholder}</Box>;
    }

    if (chip) {
      return (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {selectedItems.map((item) => (
            <Chip key={item.value} size="small" label={item.label} />
          ))}
        </Box>
      );
    }

    return selectedItems.map((item) => item.label).join(", ");
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl error={!!error} {...other}>
          {label && <InputLabel id={name}> {label} </InputLabel>}

          <Select
            {...field}
            multiple
            displayEmpty={!!placeholder}
            id={`multiple-${name}`}
            labelId={name}
            label={label}
            renderValue={renderValues}
          >
            {options.map((option) => {
              const selected = field.value.includes(option.value);

              return (
                <MenuItem
                  key={option.value}
                  disabled={
                    isOptionDisabled
                      ? isOptionDisabled(option.value, field.value)
                      : false
                  }
                  value={option.value}
                >
                  {checkbox && (
                    <Checkbox size="small" disableRipple checked={selected} />
                  )}
                  {option.label}
                </MenuItem>
              );
            })}
          </Select>

          {(!!error || helperText) && (
            <FormHelperText error={!!error}>
              {error ? error?.message : helperText}
            </FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
}

RHFMultiSelect.propTypes = {
  checkbox: PropTypes.bool,
  chip: PropTypes.bool,
  helperText: PropTypes.object,
  label: PropTypes.string,
  name: PropTypes.string,
  options: PropTypes.array,
  placeholder: PropTypes.string,
};
