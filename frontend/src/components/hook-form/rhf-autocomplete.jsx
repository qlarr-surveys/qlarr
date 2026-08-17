import PropTypes from "prop-types";
import { Controller, useFormContext } from "react-hook-form";

import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import InputAdornment from "@mui/material/InputAdornment";
import { filledInputClasses } from "@mui/material/FilledInput";

// import { countries } from 'src/assets/data';

// import Iconify from "src/components/iconify";

// ----------------------------------------------------------------------

export default function RHFAutocomplete({
  name,
  label,
  type,
  helperText,
  hiddenLabel,
  placeholder,
  ...other
}) {
  const { control, setValue } = useFormContext();

  const { multiple } = other;

  return (
    <div>s</div>
    // <Controller
    //   name={name}
    //   control={control}
    //   render={({ field, fieldState: { error } }) => {
    //     if (type === "country") {
    //       return (
    //         <Autocomplete
    //           {...field}
    //           id={`autocomplete-${name}`}
    //           autoHighlight={!multiple}
    //           disableCloseOnSelect={multiple}
    //           onChange={(event, newValue) =>
    //             setValue(name, newValue, { shouldValidate: true })
    //           }
    //           renderOption={(props, option) => {
    //             const country = getCountry(option);

    //             if (!country.label) {
    //               return null;
    //             }

    //             return (
    //               <li {...props} key={country.label}>
    //                 <Iconify
    //                   key={country.label}
    //                   icon={`circle-flags:${country.code?.toLowerCase()}`}
    //                   sx={{ mr: 1 }}
    //                 />
    //                 {country.label} ({country.code}) +{country.phone}
    //               </li>
    //             );
    //           }}
    //           renderInput={(params) => {
    //             const country = getCountry(params.inputProps.value);

    //             const baseField = {
    //               ...params,
    //               label,
    //               hiddenLabel,
    //               placeholder,
    //               error: !!error,
    //               helperText: error ? error?.message : helperText,
    //               inputProps: {
    //                 ...params.inputProps,
    //                 autoComplete: "new-password",
    //               },
    //             };

    //             if (multiple) {
    //               return <TextField {...baseField} />;
    //             }

    //             return (
    //               <TextField
    //                 {...baseField}
    //                 InputProps={{
    //                   ...params.InputProps,
    //                   startAdornment: (
    //                     <InputAdornment
    //                       position="start"
    //                       sx={{
    //                         ...(!country.code && {
    //                           display: "none",
    //                         }),
    //                       }}
    //                     >
    //                       <Iconify
    //                         icon={`circle-flags:${country.code?.toLowerCase()}`}
    //                         sx={{ mr: -0.5, ml: 0.5 }}
    //                       />
    //                     </InputAdornment>
    //                   ),
    //                 }}
    //                 sx={{
    //                   ...(!hiddenLabel && {
    //                     [`& .${filledInputClasses.root}`]: {
    //                       "& .component-iconify": {
    //                         mt: -2,
    //                       },
    //                     },
    //                   }),
    //                 }}
    //               />
    //             );
    //           }}
    //           renderTags={(selected, getTagProps) =>
    //             selected.map((option, index) => {
    //               const country = getCountry(option);

    //               return (
    //                 <Chip
    //                   {...getTagProps({ index })}
    //                   key={country.label}
    //                   label={country.label}
    //                   icon={
    //                     <Iconify
    //                       icon={`circle-flags:${country.code?.toLowerCase()}`}
    //                     />
    //                   }
    //                   size="small"
    //                   variant="soft"
    //                 />
    //               );
    //             })
    //           }
    //           {...other}
    //         />
    //       );
    //     }

    //     return (
    //       <Autocomplete
    //         {...field}
    //         id={`autocomplete-${name}`}
    //         onChange={(event, newValue) =>
    //           setValue(name, newValue, { shouldValidate: true })
    //         }
    //         renderInput={(params) => (
    //           <TextField
    //             {...params}
    //             label={label}
    //             placeholder={placeholder}
    //             error={!!error}
    //             helperText={error ? error?.message : helperText}
    //             inputProps={{
    //               ...params.inputProps,
    //               autoComplete: "new-password",
    //             }}
    //           />
    //         )}
    //         {...other}
    //       />
    //     );
    //   }}
    // />
  );
}

RHFAutocomplete.propTypes = {
  name: PropTypes.string,
  type: PropTypes.string,
  label: PropTypes.string,
  helperText: PropTypes.node,
  hiddenLabel: PropTypes.bool,
  placeholder: PropTypes.string,
};

// ----------------------------------------------------------------------

export function getCountry(inputValue) {
  const option = countries.filter((country) => country.label === inputValue)[0];

  return {
    ...option,
  };
}
