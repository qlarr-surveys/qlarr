import { useSelector, useDispatch } from "react-redux";
import { changeContent } from "~/state/design/designState";
import { contentEditable } from "~/routes";

export function useEditableHint(code, designMode) {
  const dispatch = useDispatch();

  const state = useSelector((state) => state.designState[code]);
  const lang = useSelector((state) => state.designState.langInfo.lang);

  const hintText = state.content?.[lang]?.hint || "";
  const showHint = state.showHint || false;
  const isEditable = showHint && contentEditable(designMode);

  const handleHintChange = (e) => {
    dispatch(changeContent({ code, key: "hint", lang, value: e.target.value }));
  };

  return { hintText, isEditable, handleHintChange };
}
