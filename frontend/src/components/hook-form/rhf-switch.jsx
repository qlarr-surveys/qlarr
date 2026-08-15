import PropTypes from "prop-types";
import { Controller, useFormContext } from "react-hook-form";

import Switch from "@mui/material/Switch";
import FormHelperText from "@mui/material/FormHelperText";
import FormControlLabel from "@mui/material/FormControlLabel";

// ----------------------------------------------------------------------

export default function RHFSwitch({ name, helperText, ...other }) {
  const context = useFormContext();

  if (!context) {
    return (
      <FormControlLabel
        control={<Switch {...other} name={name} checked={other.checked} />}
        {...other}
      />
    );
  }

  // const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div>
          <FormControlLabel
            control={<Switch {...field} checked={field.value} />}
            {...other}
          />

          {(!!error || helperText) && (
            <FormHelperText error={!!error}>
              {error ? error?.message : helperText}
            </FormHelperText>
          )}
        </div>
      )}
    />
  );
}

RHFSwitch.propTypes = {
  helperText: PropTypes.string,
  name: PropTypes.string,
};
