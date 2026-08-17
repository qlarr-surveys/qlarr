import { useDispatch, useSelector } from "react-redux";
import { changeAttribute, updateInstruction } from "~/state/design/designState";

export function useOrderInstructions(code) {
  const dispatch = useDispatch();

  const orderInstruction = useSelector((state) => {
    const instructionList = state.designState[code]?.instructionList || [];
    return instructionList.find((instruction) => instruction.code === "order");
  });

  const isOpen = useSelector((state) => state.designState[code].customOrder);

  const onToggle = (checked) => {
    dispatch(
      changeAttribute({
        code,
        key: "customOrder",
        value: checked,
      }),
    );
  };

  const onTextChange = (newText) => {
    dispatch(
      updateInstruction({
        code,
        instruction: {
          ...orderInstruction,
          text: newText,
          isActive: true,
        },
      }),
    );
  };

  return {
    isOpen,
    orderInstruction,
    errors: orderInstruction?.errors || [],
    onToggle,
    onTextChange,
  };
}
