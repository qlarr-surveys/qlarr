import React, { useId } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { changeAttribute } from "~/state/design/designState";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import {
  SetupField,
  SetupSelect,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";

/**
 * A setting picked from a list. The options are told apart by their place in
 * `values`, not their text, so a number stays a number when it is saved.
 */
function SelectValue({ label, rule, defaultValue, code, values, labels }) {
  const dispatch = useDispatch();
  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);
  const help = useSetupHelp();
  const id = useId();
  const value = useSelector((state) => {
    return state.designState[code]?.[rule] || defaultValue;
  });

  const selected = values.findIndex(
    (element) => String(element) === String(value)
  );

  const onChange = (event) => {
    dispatch(
      changeAttribute({ code, key: rule, value: values[event.target.value] })
    );
  };

  return (
    <SetupField label={t(label)} help={help(label)} htmlFor={id}>
      <SetupSelect id={id} value={selected} onChange={onChange}>
        {/* A saved value no option matches shows as blank, not as the first
            option, which it isn't. */}
        {selected === -1 && <option value={-1} disabled hidden />}
        {values.map((element, index) => (
          <option key={String(element)} value={index}>
            {labels ? labels[index] : element}
          </option>
        ))}
      </SetupSelect>
    </SetupField>
  );
}

export default SelectValue;
