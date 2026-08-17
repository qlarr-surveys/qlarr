import React from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { FormControl, Select, MenuItem, FormHelperText, FormLabel } from "@mui/material";
import { LANGUAGE_DEF } from '~/constants/language';

export const BaseLanguage = ({
  baseLanguage,
  onBaseLanguageChanged,
  disabled,
}) => {
  const { t } = useTranslation(NAMESPACES.MANAGE);

  return (
    <FormControl fullWidth>
      <FormLabel sx={{ fontWeight: 600, fontSize: "1.1rem", marginBottom: "4px", color: "text.primary" }}>
        {t("label.base_language")}
      </FormLabel>
      <FormHelperText sx={{ marginTop: 0, marginBottom: "12px" }}>
        {t("label.base_language_description")}
      </FormHelperText>
      <Select
        disabled={disabled}
        value={baseLanguage}
        onChange={onBaseLanguageChanged}
        size="small"
      >
        <MenuItem value={"en"}>{LANGUAGE_DEF["en"].name}</MenuItem>
        <MenuItem value={"de"}>{LANGUAGE_DEF["de"].name}</MenuItem>
        <MenuItem value={"ar"}>{LANGUAGE_DEF["ar"].name}</MenuItem>
        <MenuItem value={"es"}>{LANGUAGE_DEF["es"].name}</MenuItem>
        <MenuItem value={"pt"}>{LANGUAGE_DEF["pt"].name}</MenuItem>
        <MenuItem value={"fr"}>{LANGUAGE_DEF["fr"].name}</MenuItem>
        <MenuItem value={"nl"}>{LANGUAGE_DEF["nl"].name}</MenuItem>
      </Select>
    </FormControl>
  );
};
