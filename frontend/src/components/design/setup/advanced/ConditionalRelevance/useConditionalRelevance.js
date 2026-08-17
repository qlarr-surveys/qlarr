import { useDispatch, useSelector } from "react-redux";
import { clearRelevanceConfig, updateInstruction } from "~/state/design/designState";

export function useConditionalRelevance(code) {
  const dispatch = useDispatch();

  const conditionalRelevance = useSelector((state) => {
    const instructionList = state.designState[code]?.instructionList || [];
    return instructionList.find(
      (instruction) => instruction.code === "conditional_relevance"
    );
  });

  const onDelete = () => {
    dispatch(
      updateInstruction({
        code,
        instruction: {
          code: "conditional_relevance",
          remove: true,
        },
      })
    );
    dispatch(clearRelevanceConfig({ code }));
  };

  const onTextChange = (newText) => {
    if (conditionalRelevance) {
      dispatch(
        updateInstruction({
          code,
          instruction: {
            ...conditionalRelevance,
            text: newText,
          },
        })
      );
      dispatch(clearRelevanceConfig({ code }));
    }
  };

  const onAdd = () => {
    dispatch(
      updateInstruction({
        code,
        instruction: {
          code: "conditional_relevance",
          isActive: true,
          returnType: "boolean",
          text: "",
        },
      })
    );
  };

  return {
    conditionalRelevance,
    errors: conditionalRelevance?.errors || [],
    onDelete,
    onTextChange,
    onAdd,
  };
}
