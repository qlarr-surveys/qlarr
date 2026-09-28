import React, { useState } from "react";
import { shallowEqual, useSelector } from "react-redux";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

/** A label as one line of text: `<p style="margin: 0px;">A &amp; B</p>` → `A & B`. */
export const toText = (html) =>
  new DOMParser()
    .parseFromString(
      (html || "").replace(/<br\s*\/?>|<\/p>\s*<p[^>]*>/g, " "),
      "text/html"
    )
    .body.textContent.trim();

export const toLines = (text) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

function ManualEntryDialog({ title, t, codes, onClose, onSubmit }) {
  // the current labels in the main language, one per line
  const current = useSelector((state) => {
    const lang = state.designState.langInfo.mainLang;
    return codes
      .map((code) => toText(state.designState[code]?.content?.[lang]?.label))
      .filter((line) => line.length > 0);
  }, shallowEqual);
  const [text, setText] = useState(current.join("\n"));
  const lines = toLines(text);

  const submit = () => {
    if (lines.join("\n") !== current.join("\n")) {
      onSubmit(lines);
    }
    onClose();
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {title}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: (theme) => theme.palette.grey[500], mr: -1 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {current.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t("manual_entry_replace_warning")}
          </Alert>
        )}
        <TextField
          multiline
          autoFocus
          minRows={4}
          maxRows={12}
          fullWidth
          variant="outlined"
          placeholder={t("manual_entry_placeholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          disabled={lines.length === 0}
          onClick={submit}
        >
          {t("submit_values")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default React.memo(ManualEntryDialog);
