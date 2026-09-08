import {
  QUESTION_CODE_PATTERN,
  GROUP_CODE_PATTERN,
} from "~/constants/instruction";

export const isQuestion = (code) => QUESTION_CODE_PATTERN.test(code);
export const isGroup = (code) => GROUP_CODE_PATTERN.test(code);

// Maps every component's actual code to a human-facing numeric code
// (groups → `P1`, `P2`; questions → `Q1`, `Q2`; answers → `Q1A1`). Pure:
// derived from the survey state, not stored.
export const buildCodeIndex = (state) => {
  let retrunRestult = {};
  let groupCount = 0;
  let questionCount = 0;
  state.Survey.children?.forEach((group) => {
    groupCount++;
    retrunRestult[group.code] = "P" + groupCount;
    let groupObj = state[group.code];
    if (groupObj.children) {
      groupObj.children.forEach((question) => {
        questionCount++;
        retrunRestult[question.code] = "Q" + questionCount;
        let questionObj = state[question.code];
        if (questionObj.children) {
          questionObj.children.forEach((answer) => {
            retrunRestult[answer.qualifiedCode] =
              "Q" + questionCount + answer.code;
          });
        }
      });
    }
  });
  return retrunRestult;
};

export const isEquivalent = (a, b, visited = new WeakSet()) => {
  if (a === b) return true;

  if (typeof a === "function" || typeof b === "function") {
    return false;
  }

  if (typeof a !== "object" || typeof b !== "object") {
    return a === b;
  }

  if (a === null || b === null) {
    return a === b;
  }

  if (visited.has(a) || visited.has(b)) {
    return true;
  }

  visited.add(a);
  visited.add(b);

  const aProps = Object.getOwnPropertyNames(a);
  const bProps = Object.getOwnPropertyNames(b);

  if (aProps.length !== bProps.length) {
    return false;
  }

  for (const prop of aProps) {
    if (prop !== "key" && !isEquivalent(a[prop], b[prop], visited)) {
      return false;
    }
  }

  return true;
};

export const nextId = (elements) => {
  if (elements.length) {
    let arrayOfIntCodes = elements
      .filter((el) => el.type != "other")
      .map((el) => el.code.replace(/^\D+/g, ""))
      .filter((el) => el.length > 0);
    if (arrayOfIntCodes.length) {
      let intCodes = arrayOfIntCodes
        .map((el) => parseInt(el, 10))
        .sort(function (a, b) {
          return a - b;
        });
      if (intCodes) {
        return intCodes[intCodes.length - 1] + 1;
      }
    }
  }
  return 1;
};

export const lastIndexInArray = (array, func) => {
  if (!array) {
    return -1;
  }
  let index = array.length - 1;
  for (; index >= 0; index--) {
    if (func(array[index])) {
      return index;
    }
  }
  return -1;
};

export const firstIndexInArray = (array, func) => {
  if (!array) {
    return -1;
  }
  for (let index = 0; index < array.length; index++) {
    if (func(array[index])) {
      return index;
    }
  }
  return -1;
};
