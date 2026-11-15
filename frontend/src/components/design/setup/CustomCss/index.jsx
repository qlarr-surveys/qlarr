import React, { useId } from "react";
import { useDispatch, useSelector } from "react-redux";
import { changeCustomCss } from "~/state/design/designState";
import {
  SetupField,
  setupFieldStyles,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";

const PLACEHOLDER = `/* Enter your CSS code here... */
  background-color: #007bff;
  color: white;
`;

function CustomCSS({ code, t }) {
  const dispatch = useDispatch();
  const help = useSetupHelp();
  const id = useId();

  const inputValue = useSelector((state) => {
    return state.designState[code].customCss;
  });

  const helpText = [help("custom_css"), help("expression_reference")]
    .filter(Boolean)
    .join("\n\n");

  return (
    <SetupField label={t("custom_css")} help={helpText} htmlFor={id}>
      <textarea
        id={id}
        rows={6}
        dir="ltr"
        spellCheck={false}
        value={inputValue || ""}
        onChange={(event) =>
          dispatch(changeCustomCss({ code, value: event.target.value }))
        }
        placeholder={PLACEHOLDER}
        className={`${setupFieldStyles.textarea} ${setupFieldStyles.code}`}
      />
    </SetupField>
  );
}

export default CustomCSS;
