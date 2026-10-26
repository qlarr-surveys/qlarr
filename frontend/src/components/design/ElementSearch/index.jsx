import React, { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import { useSelector } from "react-redux";
import { stripTags } from "~/utils/design/utils";
import { questionIconByType } from "~/components/Questions/utils";
import styles from "./ElementSearch.module.css";

const MAX_RESULTS = 50;

const isFindShortcut = (event) =>
  (event.ctrlKey || event.metaKey) &&
  !event.altKey &&
  !event.shiftKey &&
  event.key?.toLowerCase() === "f";

function buildEntries(designState) {
  const lang = designState.langInfo?.lang;
  const mainLang = designState.langInfo?.mainLang;
  const labelOf = (component) =>
    stripTags(
      component?.content?.[lang]?.label ||
        component?.content?.[mainLang]?.label ||
        ""
    ).trim();

  const entries = [];
  designState.Survey.children?.forEach((groupRef) => {
    const group = designState[groupRef.code];
    entries.push({
      code: groupRef.code,
      groupCode: groupRef.code,
      type: group.groupType.toLowerCase(),
      isGroup: true,
      displayCode: designState.index[groupRef.code],
      label: labelOf(group),
    });
    group.children?.forEach((questionRef) => {
      const question = designState[questionRef.code];
      entries.push({
        code: questionRef.code,
        groupCode: groupRef.code,
        type: question.type,
        isGroup: false,
        displayCode: designState.index[questionRef.code],
        label: labelOf(question),
      });
    });
  });
  return entries;
}

function rank(entry, query) {
  const code = entry.code.toLowerCase();
  const displayCode = entry.displayCode.toLowerCase();
  if (code === query || displayCode === query) return 0;
  if (code.startsWith(query) || displayCode.startsWith(query)) return 1;
  if (entry.label.toLowerCase().includes(query)) return 2;
  return -1;
}

function filterEntries(entries, input) {
  const query = input.trim().toLowerCase();
  if (!query) return entries.slice(0, MAX_RESULTS);
  return entries
    .map((entry, order) => ({ entry, order, score: rank(entry, query) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => a.score - b.score || a.order - b.order)
    .slice(0, MAX_RESULTS)
    .map(({ entry }) => entry);
}

function SearchBox({ t, onSelect, onClose }) {
  const designState = useSelector((state) => state.designState);
  const entries = useMemo(() => buildEntries(designState), [designState]);
  const [input, setInput] = useState("");
  const options = useMemo(
    () => filterEntries(entries, input),
    [entries, input]
  );

  return (
    <Paper elevation={6} className={styles.searchBox}>
      <Autocomplete
        open
        autoHighlight
        disablePortal
        options={options}
        filterOptions={(x) => x}
        inputValue={input}
        onInputChange={(_, value, reason) => {
          if (reason === "input") setInput(value);
        }}
        value={null}
        onChange={(_, entry) => {
          if (entry) onSelect(entry);
        }}
        onClose={(_, reason) => {
          if (reason === "escape" || reason === "blur") onClose();
        }}
        getOptionLabel={(entry) => entry.displayCode}
        noOptionsText={t("find_element_no_results")}
        slotProps={{ paper: { elevation: 0, className: styles.results } }}
        renderOption={({ key, ...props }, entry) => (
          <li key={entry.code} {...props}>
            <Box className={styles.option}>
              <span className={styles.optionIcon}>
                {entry.isGroup ? (
                  <FormatListBulletedIcon fontSize="small" />
                ) : (
                  questionIconByType(entry.type)
                )}
              </span>
              <Typography
                component="span"
                variant="body2"
                className={styles.optionCode}
              >
                {entry.displayCode}
              </Typography>
              {entry.code !== entry.displayCode && (
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  className={styles.optionCode}
                >
                  {entry.code}
                </Typography>
              )}
              <Typography
                component="span"
                variant="body2"
                color="text.secondary"
                noWrap
                className={styles.optionLabel}
              >
                {entry.label}
              </Typography>
            </Box>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            autoFocus
            size="small"
            placeholder={t("find_element_placeholder")}
            inputProps={{ ...params.inputProps, "data-element-search": true }}
          />
        )}
      />
    </Paper>
  );
}

function ElementSearch({ t, onNavigate }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!isFindShortcut(event)) return;
      if (document.activeElement?.dataset?.elementSearch) {
        return;
      }
      event.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSelect = (entry) => {
    setOpen(false);
    onNavigate(entry);
  };

  const handleClose = () => setOpen(false);

  return (
    <Box className={styles.container}>
      {open ? (
        <SearchBox t={t} onSelect={handleSelect} onClose={handleClose} />
      ) : (
        <Tooltip title={t("find_element")}>
          <Paper elevation={3} className={styles.trigger}>
            <IconButton
              aria-label={t("find_element")}
              onClick={() => setOpen(true)}
            >
              <SearchIcon />
            </IconButton>
          </Paper>
        </Tooltip>
      )}
    </Box>
  );
}

export default React.memo(ElementSearch);
