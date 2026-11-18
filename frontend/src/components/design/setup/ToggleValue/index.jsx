import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { changeAttribute } from "~/state/design/designState";
import {
  SetupToggle,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";

function ToggleValue({ label, code, rule, t }) {
  const dispatch = useDispatch();
  const help = useSetupHelp();

  const value = useSelector((state) => {
    return state.designState[code][rule] || false;
  });

  const onChange = (value) => {
    dispatch(changeAttribute({ code, key: rule, value }));
  };

  return (
    <SetupToggle
      label={t(label)}
      help={help(label)}
      checked={value}
      onChange={onChange}
    />
  );
}

export default ToggleValue;
