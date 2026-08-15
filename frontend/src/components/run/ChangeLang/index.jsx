import React from "react";
import { useSelector } from "react-redux";
import { shallowEqual, useDispatch } from "react-redux";
import { FormControl, MenuItem, Select } from "@mui/material";
import { langChange } from "~/state/runState";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

function ChangeLang(props) {
  const state = useSelector((state) => {
    return {
      navigate: state.runState.navigate,
      lang: state.runState.lang,
    };
  }, shallowEqual);
  const dispatch = useDispatch();

  const { t } = useTranslation(NAMESPACES.RUN);

  return (
    props.additionalLang &&
    props.additionalLang.length ? (
      <FormControl style={{ maxWidth: "250px" }} variant="standard">
        <Select
          labelId="change-lang-label"
          sx={{
            backgroundColor: "background.paper",
            color: "primary.main",
            paddingLeft: "8px",
          }}
          id="ChangeLang"
          label={t("lang")}
          value={props.lang.code}
          onChange={(event) => {
            dispatch(
              langChange({
                lang: event.target.value,
              })
            );
          }}
        >
          <MenuItem value={props.lang.code}>{props.lang.name}</MenuItem>
          {props.additionalLang
            ? props.additionalLang.map((lang, index) => {
                return (
                  <MenuItem key={index} value={lang.code}>
                    {lang.name}
                  </MenuItem>
                );
              })
            : ""}
        </Select>
      </FormControl>
    ) : <></>
  );
}

export default ChangeLang;
