import React, { useId } from "react";
import { useDispatch, useSelector } from "react-redux";
import { changeAttribute } from "~/state/design/designState";
import {
  SetupField,
  setupFieldStyles as styles,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";

function SelectDate({ label, rule, code, t }) {
  const dispatch = useDispatch();
  const help = useSetupHelp();
  const id = useId();

  const value = useSelector((state) => {
    return state.designState[code][rule] || "";
  });

  return (
    <SetupField label={t(label)} help={help(label)} htmlFor={id}>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(event) => {
          dispatch(
            changeAttribute({ code, key: rule, value: event.target.value })
          );
        }}
        className={`${styles.input} ${styles.inputShort}`}
      />
    </SetupField>
  );
}

export default SelectDate;
