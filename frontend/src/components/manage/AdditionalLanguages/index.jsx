import React from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import {
  FormControl,
  FormLabel,
  FormControlLabel,
  Checkbox,
  FormHelperText,
} from "@mui/material";
import { LANGUAGE_DEF } from "~/constants/language";

export const AdditionalLanguages = ({
  baseLanguage,
  onAdditionalLanguagesChanged,
  additionalLanguages,
  disabled,
}) => {
  const { t } = useTranslation(NAMESPACES.MANAGE);

  return (
    <FormControl sx={{ marginTop: "16px" }}>
      <FormLabel id="additional-languages-label" sx={{ fontWeight: 600, fontSize: "1.1rem", marginBottom: "4px", color: "text.primary" }}>
        {t("label.additional_languages")}
      </FormLabel>
      <FormHelperText sx={{ marginTop: 0, marginBottom: "8px" }}>
        {t("label.additional_languages_description")}
      </FormHelperText>
      {Object.keys(LANGUAGE_DEF).map((key) => {
        const el = LANGUAGE_DEF[key];
        return (
          <FormControlLabel
            key={key}
            control={
              <Checkbox
                disabled={baseLanguage == el.code || disabled}
                checked={additionalLanguages.indexOf(el.code) > -1}
                onChange={onAdditionalLanguagesChanged}
                name={el.code}
              />
            }
            label={el.name}
          />
        );
      })}
    </FormControl>
  );
};
