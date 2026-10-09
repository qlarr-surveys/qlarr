import React, { useEffect, useMemo, useRef, useState } from "react";

import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Autocomplete, Box, CircularProgress, TextField } from "@mui/material";
import debounce from "lodash/debounce";
import styles from "../AutoComplete/AutoComplete.module.css";
import { setDirty } from "~/state/templateState";
import { hierarchicalRow, hierarchicalSearch } from "~/networking/run";
import { useService } from "~/hooks/use-service";
import { valueChange, valueMetaChange } from "~/state/runState";
import { stripTags } from "~/utils/design/utils";

// One autocomplete field per level (level == answer), each filtered by the levels
// above it. The selection is local UI state until every level is resolved; only
// then are the values set — every answer's value in the survey's DEFAULT
// language — together with the question's `value_meta`: the selected row in every
// language. The engine saves value_meta with the response, so a completed answer
// shows in the respondent's current language after back-navigation, resume or a
// language switch with no lookup (and each level's masked_value pipes it).
function HierarchicalAutoCompleteQuestion({ component }) {
  const { t } = useTranslation("run");
  const runService = useService("run");
  const dispatch = useDispatch();

  const levels = component.answers || [];
  const levelCount = levels.length;
  const filename = component.resources?.hierarchicalAutoComplete;

  const lang = useSelector((state) => state.runState.values.Survey.lang);
  const defaultLang = useSelector(
    (state) => state.runState.data?.survey?.defaultLang?.code || "en"
  );
  // The stored values (default language), joined so the selector stays a
  // primitive and only re-renders on a real change.
  const storedKey = useSelector((state) =>
    JSON.stringify(
      levels.map((level) => state.runState.values[level.qualifiedCode]?.value || "")
    )
  );
  const storedValues = useMemo(() => JSON.parse(storedKey), [storedKey]);
  const isComplete =
    levelCount > 0 && storedValues.every((value) => value !== "");

  const valueMeta = useSelector(
    (state) => state.runState.values[component.qualifiedCode]?.value_meta
  );

  // The completed path in the respondent's language. A row without that
  // language (picked from the default language's data) shows the stored values,
  // which are the default-language path.
  const displayKey = useMemo(() => {
    if (!isComplete) return "";
    return JSON.stringify(valueMeta?.[lang] || storedValues);
  }, [isComplete, valueMeta, lang, storedValues]);

  const emptyPath = () => Array(levelCount).fill("");
  const [selected, setSelected] = useState(() =>
    displayKey ? JSON.parse(displayKey) : emptyPath()
  );
  const [options, setOptions] = useState(() => levels.map(() => []));
  const [loading, setLoading] = useState(() => levels.map(() => false));

  // A completed answer (from the server, or a language switch) drives the
  // fields. Clearing the values ourselves must not wipe the partial selection,
  // so only a completed answer is pushed into local state.
  useEffect(() => {
    if (displayKey) setSelected(JSON.parse(displayKey));
  }, [displayKey]);

  const setLevelState = (setter, k, value) =>
    setter((prev) => prev.map((item, i) => (i === k ? value : item)));

  // Latest request per level, so a slow, stale response never overwrites a newer one.
  const requestIds = useRef(levels.map(() => 0));
  const fetchOptions = useMemo(
    () =>
      levels.map((_, k) =>
        debounce(async (query, prefix) => {
          const requestId = ++requestIds.current[k];
          setLevelState(setLoading, k, true);
          try {
            const data = await hierarchicalSearch(
              runService,
              filename,
              k,
              prefix,
              query,
              lang,
              defaultLang
            );
            if (requestId === requestIds.current[k]) {
              setLevelState(setOptions, k, data || []);
            }
          } catch (error) {
            console.error("Failed to fetch options:", error);
            if (requestId === requestIds.current[k]) {
              setLevelState(setOptions, k, []);
            }
          } finally {
            if (requestId === requestIds.current[k]) {
              setLevelState(setLoading, k, false);
            }
          }
        }, 300)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filename, levelCount, lang, defaultLang]
  );
  useEffect(() => () => fetchOptions.forEach((fn) => fn.cancel()), [fetchOptions]);

  const clearValues = () => {
    levels.forEach((level) =>
      dispatch(valueChange({ componentCode: level.qualifiedCode, value: "" }))
    );
    dispatch(
      valueMetaChange({ componentCode: component.qualifiedCode, valueMeta: {} })
    );
  };

  const resolveRow = async (path) => {
    try {
      const found = await hierarchicalRow(
        runService,
        filename,
        path,
        lang,
        defaultLang
      );
      if (!found) return;
      const defaultPath = found[defaultLang] || [];
      dispatch(
        valueMetaChange({
          componentCode: component.qualifiedCode,
          valueMeta: found,
        })
      );
      levels.forEach((level, i) =>
        dispatch(
          valueChange({
            componentCode: level.qualifiedCode,
            value: defaultPath[i] || "",
          })
        )
      );
    } catch (error) {
      console.error("Failed to resolve the selected row:", error);
    }
  };

  // Selecting (or clearing) level k resets every level below it. Values are only
  // ever set once every level is resolved, so any change to a completed answer
  // clears them.
  const handleChange = (k, option) => {
    const next = selected.map((value, i) =>
      i < k ? value : i === k ? option || "" : ""
    );
    setSelected(next);
    setOptions((prev) => prev.map((item, i) => (i > k ? [] : item)));
    if (isComplete) clearValues();
    if (option && k === levelCount - 1) resolveRow(next);
  };

  const handleInputChange = (k, query) => {
    if (!query) {
      fetchOptions[k].cancel();
      requestIds.current[k]++;
      setLevelState(setOptions, k, []);
      setLevelState(setLoading, k, false);
      return;
    }
    if (filename) fetchOptions[k](query, selected.slice(0, k));
  };

  const lostFocus = (level) => {
    dispatch(setDirty(level.qualifiedCode));
    dispatch(setDirty(component.qualifiedCode));
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      {levels.map((level, k) => (
        <HierarchicalLevel
          key={level.qualifiedCode}
          level={level}
          label={stripTags(level.content?.label || "")}
          value={selected[k] || null}
          options={options[k] || []}
          loading={loading[k] || false}
          disabled={!filename || (k > 0 && !selected[k - 1])}
          noOptionsText={t("no_options")}
          onChange={(option) => handleChange(k, option)}
          onInputChange={(query) => handleInputChange(k, query)}
          onBlur={() => lostFocus(level)}
        />
      ))}
    </Box>
  );
}

const HierarchicalLevel = React.memo(function HierarchicalLevel({
  level,
  label,
  value,
  options,
  loading,
  disabled,
  noOptionsText,
  onChange,
  onInputChange,
  onBlur,
}) {
  const invalid = useSelector((state) => {
    const show_errors = state.runState.values.Survey.show_errors;
    const isDirty = state.templateState[level.qualifiedCode];
    const validity = state.runState.values[level.qualifiedCode]?.validity;
    return (show_errors || isDirty) && validity === false;
  });

  return (
    <Autocomplete
      className={styles.autocompleteResponsive}
      noOptionsText={noOptionsText}
      value={value}
      // keep the selection among the options (MUI warns otherwise)
      options={value && !options.includes(value) ? [value, ...options] : options}
      disabled={disabled}
      loading={loading}
      // the server already filtered; keep its matches as they are
      filterOptions={(x) => x}
      onChange={(event, option) => onChange(option)}
      onInputChange={(event, query, reason) => {
        // "reset" is MUI syncing the input to the selected value, not typing
        if (reason !== "reset") onInputChange(query);
      }}
      onBlur={onBlur}
      getOptionLabel={(option) => option || ""}
      isOptionEqualToValue={(option, selected) => option === selected}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={invalid}
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
  );
});

export default HierarchicalAutoCompleteQuestion;
