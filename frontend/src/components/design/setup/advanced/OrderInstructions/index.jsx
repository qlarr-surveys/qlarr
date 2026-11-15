import React from "react";
import {
  SetupHint,
  SetupToggle,
  setupFieldStyles,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";
import { useOrderInstructions } from "./useOrderInstructions";

const cx = (...names) => names.filter(Boolean).join(" ");

function OrderInstructions({ code, t }) {
  const help = useSetupHelp();
  const { isOpen, orderInstruction, errors, onToggle, onTextChange } =
    useOrderInstructions(code);
  const label = t("order_instructions_title");

  return (
    <SetupToggle
      label={label}
      help={help("order_instructions")}
      checked={!!isOpen}
      onChange={onToggle}
    >
      {isOpen && (
        <>
          <textarea
            rows={3}
            dir="ltr"
            spellCheck={false}
            aria-label={label}
            aria-invalid={errors.length > 0}
            placeholder={t("order_instruction_placeholder")}
            value={orderInstruction?.text || ""}
            onChange={(e) => onTextChange(e.target.value)}
            className={cx(
              setupFieldStyles.textarea,
              setupFieldStyles.code,
              errors.length > 0 && setupFieldStyles.invalid
            )}
          />
          {errors.map((err, i) => (
            <SetupHint key={i} error>
              {err.message}
            </SetupHint>
          ))}
        </>
      )}
    </SetupToggle>
  );
}

export default OrderInstructions;
