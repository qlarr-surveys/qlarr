import React from "react";
import { Button, Divider, Menu, MenuItem } from "@mui/material";
import { AddOutlined } from "@mui/icons-material";

/**
 * "Add rule" button that opens a menu of the validations not yet active for
 * this question, plus (when supported) an entry to add a custom rule.
 */
function AddRulePicker({
  availablePresets,
  supportsCustom,
  onAddPreset,
  onAddCustom,
  t,
}) {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const hasChoices = availablePresets.length > 0 || supportsCustom;
  if (!hasChoices) {
    return null;
  }

  const close = () => setAnchorEl(null);

  return (
    <>
      <Button
        variant="outlined"
        fullWidth
        startIcon={<AddOutlined />}
        sx={{ mt: 2 }}
        onClick={(event) => setAnchorEl(event.currentTarget)}
      >
        {t("validation_add_rule")}
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={close}>
        {availablePresets.map((rule) => (
          <MenuItem
            key={rule}
            onClick={() => {
              onAddPreset(rule);
              close();
            }}
          >
            {t(rule + "_title")}
          </MenuItem>
        ))}
        {supportsCustom && availablePresets.length > 0 && <Divider />}
        {supportsCustom && (
          <MenuItem
            onClick={() => {
              onAddCustom();
              close();
            }}
          >
            {t("add_custom_validation_rule")}
          </MenuItem>
        )}
      </Menu>
    </>
  );
}

export default AddRulePicker;
