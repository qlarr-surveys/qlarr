import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { changeRelevance } from "~/state/design/designState";
import {
  SetupToggle,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";

export default function DisabledToggle({ code, t }) {
  const dispatch = useDispatch();
  const help = useSetupHelp();
  const rule =
    useSelector((s) => s.designState[code]?.relevance?.rule) ?? "show_always";
  const checked = rule === "hide_always";

  const onChange = (nextChecked) => {
    dispatch(
      changeRelevance({
        code,
        key: "relevance",
        value: {
          rule: nextChecked ? "hide_always" : "show_always",
          logic: undefined,
        },
      })
    );
  };
  return (
    <SetupToggle
      label={t("disabled")}
      help={help("disabled")}
      checked={checked}
      onChange={onChange}
    />
  );
}
