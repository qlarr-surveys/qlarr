import React, { useCallback, useEffect, useState } from "react";

import { shallowEqual, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Autocomplete, CircularProgress, TextField } from "@mui/material";
import { useDispatch } from "react-redux";
import styles from "./AutoComplete.module.css";
import debounce from "lodash/debounce";
import { setDirty } from "~/state/templateState";
import { autoCompleteSearch } from "~/networking/run";
import { useService } from "~/hooks/use-service";
import { valueChange } from "~/state/runState";

function AutoCompleteQuestion(props) {
  const { t } = useTranslation("run");
  const runService = useService("run");
  const state = useSelector((state) => {
    let questionState = state.runState.values[props.component.qualifiedCode];
    let show_errors = state.runState.values.Survey.show_errors;
    let isDirty = state.templateState[props.component.qualifiedCode];
    let validity = questionState?.validity;
    let invalid = (show_errors || isDirty) && validity === false;
    let value = questionState?.value || "";
    return {
      value: value,
      invalid: invalid,
    };
  }, shallowEqual);
  const dispatch = useDispatch();

  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(state.value);

  useEffect(() => {
    setInputValue(state.value);
  }, [state.value]);

  const fetchOptions = useCallback(
    debounce(async (query) => {
      const uuid = props.component.resources.autoComplete;
      if (!query || !uuid) {
        setOptions([]);
        return;
      }

      setLoading(true);
      try {
        const response = autoCompleteSearch(runService, uuid, query);
        const data = await response;
        console.log("data", data);
        setOptions(data);
      } catch (error) {
        console.error("Failed to fetch options:", error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  const handleChange = (event, value) => {
    dispatch(
      valueChange({
        componentCode: props.component.qualifiedCode,
        value: value,
      })
    );
  };

  const lostFocus = (event) => {
    dispatch(setDirty(event.target.name));
  };

  const handleInputChange = (event, newInputValue) => {
    setInputValue(newInputValue);
    if(!newInputValue){
      setOptions([])
    }
    if (!options.includes(newInputValue)) {
      dispatch(
        valueChange({
          componentCode: props.component.qualifiedCode,
          value: "",
        })
      );
    }
    
    if (newInputValue) {
      fetchOptions(newInputValue);
    }
  };

  return (
    <div className={styles.questionItem}>
      <Autocomplete
        id="search-autocomplete"
        className={styles.autocompleteResponsive}
        noOptionsText={t('no_options')}
        open={open}
        value={state.value}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        options={options}
        onBlur={lostFocus}
        onChange={handleChange}
        loading={loading}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        getOptionLabel={(option) => option || ""} // adjust to your data
        isOptionEqualToValue={(option, value) => option === value} // adjust to your data
        renderInput={(params) => (
          <TextField
            {...params}
            label={state.showHint ? state.content?.hint || "" : ""}
            variant="outlined"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading && <CircularProgress color="inherit" size={20} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
    </div>
  );
}

export default AutoCompleteQuestion;
