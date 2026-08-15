import { useState } from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { convertQuestion } from "~/state/design/designState";
import {
  CONVERTIBLE_CHOICE_TYPES,
  CONVERTIBLE_ARRAY_TYPES,
  CONVERTIBLE_TEXT_TYPES,
  CONVERTIBLE_DATE_TIME_TYPES,
  isArrayType,
  isTextType,
  isDateTimeType,
} from "~/constants/design";
import {
  computeChoiceLostAttributes,
  computeArrayLostAttributes,
  computeTextLostAttributes,
  computeDateTimeLostAttributes,
} from "./utils";

export function useConvertQuestionType(code) {
  const dispatch = useDispatch();
  const [pendingType, setPendingType] = useState(null);
  const [lostAttributes, setLostAttributes] = useState([]);

  const question = useSelector((s) => s.designState[code]);
  const type = question?.type;
  const isArray = isArrayType(type);
  const isText = isTextType(type);
  const isDateTime = isDateTimeType(type);

  const answers = useSelector(
    (s) =>
      isArray || isText || isDateTime
        ? []
        : (question?.children || []).map((c) => s.designState[c.qualifiedCode]),
    shallowEqual
  );

  const columns = useSelector(
    (s) =>
      isArray
        ? (question?.children || [])
            .filter((c) => c.type === "column")
            .map((c) => s.designState[c.qualifiedCode])
        : [],
    shallowEqual
  );

  const convertibleTypes = isArray
    ? CONVERTIBLE_ARRAY_TYPES
    : isText
    ? CONVERTIBLE_TEXT_TYPES
    : isDateTime
    ? CONVERTIBLE_DATE_TIME_TYPES
    : CONVERTIBLE_CHOICE_TYPES;

  const handleChange = (newType) => {
    if (!type || newType === type) return;
    const lost = isArray
      ? computeArrayLostAttributes(question, columns, newType)
      : isText
      ? computeTextLostAttributes(question, newType)
      : isDateTime
      ? computeDateTimeLostAttributes(question, newType)
      : computeChoiceLostAttributes(question, answers, newType);
    if (lost.length > 0) {
      setLostAttributes(lost);
      setPendingType(newType);
    } else {
      dispatch(convertQuestion({ questionCode: code, newType }));
    }
  };

  const handleConfirm = () => {
    dispatch(convertQuestion({ questionCode: code, newType: pendingType }));
    setPendingType(null);
    setLostAttributes([]);
  };

  const handleCancel = () => {
    setPendingType(null);
    setLostAttributes([]);
  };

  return {
    type,
    convertibleTypes,
    pendingType,
    lostAttributes,
    handleChange,
    handleConfirm,
    handleCancel,
  };
}
