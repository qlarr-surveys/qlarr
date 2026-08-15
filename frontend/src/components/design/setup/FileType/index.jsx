import React from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormLabel,
} from "@mui/material";

function FileType({value, onValueChanged}) {

  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);


  const onFileTypeChanged = (e) => {
    let finalValue = [...value];
    if (!e.target.checked) {
      finalValue = value.filter((el) => el != e.target.name);
    } else {
      finalValue.push(e.target.name);
    }
    onValueChanged(finalValue)
  };

  return (
    <FormControl>
      <FormLabel id="file-type-label">{t("file_type")}</FormLabel>
      <FormControlLabel
        control={
          <Checkbox
            checked={value.indexOf("presentation") > -1}
            onChange={onFileTypeChanged}
            name="presentation"
          />
        }
        label={t("file_types.presentation")}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={value.indexOf("document") > -1}
            onChange={onFileTypeChanged}
            name="document"
          />
        }
        label={t("file_types.document")}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={value.indexOf("spreadsheet") > -1}
            onChange={onFileTypeChanged}
            name="spreadsheet"
          />
        }
        label={t("file_types.spreadsheet")}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={value.indexOf("pdf") > -1}
            onChange={onFileTypeChanged}
            name="pdf"
          />
        }
        label={t("file_types.pdf")}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={value.indexOf("image") > -1}
            onChange={onFileTypeChanged}
            name="image"
          />
        }
        label={t("file_types.image")}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={value.indexOf("video") > -1}
            onChange={onFileTypeChanged}
            name="video"
          />
        }
        label={t("file_types.video")}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={value.indexOf("audio") > -1}
            onChange={onFileTypeChanged}
            name="audio"
          />
        }
        label={t("file_types.audio")}
      />
    </FormControl>
  );
}

export default React.memo(FileType);
