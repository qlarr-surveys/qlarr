import { accessibleDependencies } from "@qlarr/design-core/utils/dependencies";
import { REPEAT_TOKEN_PLACEHOLDER } from "@qlarr/design-core/state/repetition";
import { isQuestion, stripTags } from "~/utils/design/utils";

export const buildReferences = (componentIndices, code, state, mainLang) => {
  let dependencies = accessibleDependencies(componentIndices, code);
  let returnResult = [];
  // Inside a repeatable: offer the "repeat label" (this copy's identity) first.
  const repeatLabel = buildRepeatLabelReference(
    enclosingRepeatSource(componentIndices, code, state)
  );
  if (repeatLabel) {
    returnResult.push(repeatLabel);
  }
  dependencies.forEach((el) => {
    if (isQuestion(el)) {
      const reference = buildReference(el, state[el], state, mainLang);
      if (reference.length) {
        returnResult = returnResult.concat(reference);
      }
    }
  });
  return returnResult;
};

// repeatSource of the enclosing repeatable — self, owning question (answers embed
// it, e.g. Q1A2 -> Q1), or an ancestor group — else null.
const enclosingRepeatSource = (componentIndices, code, state) => {
  const candidates = [code];
  const owningQuestion = String(code).match(/Q[a-z0-9_]+/)?.[0];
  if (owningQuestion && owningQuestion !== code) candidates.push(owningQuestion);

  const indexMap = new Map((componentIndices || []).map((c) => [c.code, c]));
  const seen = new Set();
  let cur = owningQuestion || code;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const parent = indexMap.get(cur)?.parent;
    if (parent) candidates.push(parent);
    cur = parent;
  }

  for (const candidate of candidates) {
    if (state[candidate]?.repeatSource) return state[candidate].repeatSource;
  }
  return null;
};

// "Repeat label" reference; engine substitutes $repeat_token per copy.
//   number -> iteration number; mcq -> picked option's label
//   (carryOther: the "other" copy shows the write-in, hence the branch).
const buildRepeatLabelReference = (repeatSource) => {
  if (!repeatSource || !repeatSource.kind) return null;
  const { kind, sourceCode } = repeatSource;

  let instruction;
  if (kind === "number") {
    instruction = REPEAT_TOKEN_PLACEHOLDER;
  } else if (kind === "mcq") {
    if (!sourceCode) return null;
    const optionLabel = `${sourceCode}A${REPEAT_TOKEN_PLACEHOLDER}.label`;
    instruction = repeatSource.carryOther
      ? `("${REPEAT_TOKEN_PLACEHOLDER}" == "other") ? ${sourceCode}AotherAtext.value : ${optionLabel}`
      : optionLabel;
  } else {
    return null;
  }

  return {
    id: "repeat_label",
    instruction,
    value: "Repeat label",
    type: "Repetition",
  };
};

const buildReference = (code, component, state, mainLang) => {
  const label =
    state.index[code] + ". " + stripTags(component.content?.[mainLang]?.label);
  let instruction = "";
  let type = component.type;
  switch (component.type) {
    case "scq_icon_array":
    case "mcq_array":
    case "scq_array":
      return component.children
        .filter((el) => el.type == "row")
        .map((element) => {
          return {
            value:
              label +
              " - " +
              code +
              "." +
              stripTags(
                state[element.qualifiedCode].content?.[mainLang]?.label
              ),
            id: code + element.code,
            type: "Array Row",
            instruction: code + element.code + ".masked_value",
          };
        });
    case "multiple_text":
      return component.children.map((element) => {
        return {
          value:
            label +
            " - " +
            code +
            "." +
            stripTags(state[element.qualifiedCode].content?.[mainLang]?.label),
          id: code + element.code,
          type: "Multiple Text",
          instruction: code + element.code + ".value",
        };
      });
      break;
    case "text":
      type = "Short Text";
      instruction = `${code}.value`;
      break;
    case "nps":
      type = "NPS";
      instruction = `${code}.value`;
      break;
    case "email":
      type = "Email";
      instruction = `${code}.value`;
      break;
    case "autocomplete":
      type = "Autocomplete";
      instruction = `${code}.value`;
      break;
    case "paragraph":
      instruction = `${code}.value`;
      type = "Long Text";
      break;
    case "number":
      type = "Number";
      instruction = `${code}.value`;
      break;
    case "date":
      type = "Date";
      instruction = `${code}.masked_value`;
      break;
    case "time":
      type = "time";
      instruction = `${code}.masked_value`;
      break;
    case "date_time":
      type = "Date Time";
      instruction = `${code}.masked_value`;
      break;
    case "scq":
      type = "SCQ";
      instruction = `${code}.masked_value`;
      break;
    case "icon_scq":
      type = "Icon SCQ";
      instruction = `${code}.masked_value`;
      break;
    case "image_scq":
      type = "Image SCQ";
      instruction = `${code}.masked_value`;
      break;
    case "mcq":
      type = "MCQ";
      instruction = `${code}.masked_value`;
      break;
    case "image_mcq":
      type = "Image MCQ";
      instruction = `${code}.masked_value`;
      break;
    case "icon_mcq":
      type = "Icon MCQ";
      instruction = `${code}.masked_value`;
      break;
    default:
      return [];
  }
  const references = [
    { id: code, instruction: instruction, value: label, type: type },
  ];
  // Choice questions (scq/mcq and their icon/image variants) may carry an
  // "other" option with a free-text write-in. Its value is pipeable too, but
  // it lives on nested Aother > Atext children the switch above never inspects.
  const otherReference = buildOtherReference(
    code,
    component,
    state,
    mainLang,
    label
  );
  if (otherReference) {
    references.push(otherReference);
  }
  return references;
};

const buildOtherReference = (code, component, state, mainLang, label) => {
  const otherChild = component.children?.find((el) => el.code === "Aother");
  if (!otherChild) {
    return null;
  }
  const otherState = state[otherChild.qualifiedCode];
  const textChild = otherState?.children?.find((el) => el.code === "Atext");
  if (!textChild) {
    return null;
  }
  const otherLabel =
    stripTags(otherState?.content?.[mainLang]?.label || "") || "Other";
  return {
    id: code + "AotherAtext",
    instruction: `${code}AotherAtext.value`,
    value: label + " - " + otherLabel,
    type: "Other Text",
  };
};
