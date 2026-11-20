// @ts-nocheck — loose JS-origin logic; internals stay untyped, public API typed at index.ts

export const buildValidationDefaultData = (rule) => {
  switch (rule) {
    case "validation_required":
    case "validation_one_response_per_col":
    case "validation_pattern_email":
      return {};
    case "validation_min_char_length":
      return {
        min_length: 2,
      };
    case "validation_max_char_length":
      return {
        max_length: 30,
      };
    case "validation_contains":
      return {
        contains: "",
      };
    case "validation_not_contains":
      return {
        not_contains: "",
      };
    case "validation_pattern":
      return {
        pattern: "",
      };
    case "validation_max_word_count":
      return {
        max_count: 300,
      };
    case "validation_min_word_count":
      return {
        min_count: 300,
      };
    case "validation_between":
      return {
        lower_limit: 20,
        upper_limit: 100,
      };
    case "validation_not_between":
      return {
        lower_limit: 20,
        upper_limit: 100,
      };
    case "validation_lt":
      return {
        number: 20,
      };
    case "validation_lte":
      return {
        number: 20,
      };
    case "validation_gt":
      return {
        number: 20,
      };
    case "validation_gte":
      return {
        number: 20,
      };
    case "validation_equals":
      return {
        number: 20,
      };
    case "validation_not_equal":
      return {
        number: 20,
      };
    case "validation_min_ranking_count":
    case "validation_min_option_count":
      return {
        min_count: 1,
      };
    case "validation_max_ranking_count":
    case "validation_max_option_count":
      return {
        max_count: 1,
      };
    case "validation_ranking_count":
    case "validation_option_count":
      return {
        count: 1,
      };
    case "validation_file_types":
      return {
        fileTypes: ["image"],
      };
    case "validation_max_file_size":
      return {
        max_size: 250,
      };
    default:
      throw "unrecognized rule " + rule;
  }
};

export const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

function collectExistingGroupCodes(groups) {
  const ids = new Set();
  if (Array.isArray(groups)) {
    groups.forEach((g) => {
      if (g && g.code) ids.add(g.code);
    });
  }
  return ids;
}

// The part of a preferred code after its Q/G prefix, lowercased; undefined if
// it isn't a valid code body ([a-z0-9_]+), so the caller falls back to a random id.
const preferredBare = (preferredCode, prefix) => {
  const bare = preferredCode?.replace(prefix, "").toLowerCase();
  return bare && /^[a-z0-9_]+$/.test(bare) ? bare : undefined;
};

export const nextGroupId = (groups, preferredCode) => {
  const existing = collectExistingGroupCodes(groups);
  const bare = preferredBare(preferredCode, /^G/);
  if (bare && !existing.has("G" + bare)) {
    return bare;
  }
  return generateId(existing);
};

function collectExistingIds(state, groups) {
  const ids = new Set();

  groups.forEach((group) => {
    const groupObj = state[group.code];
    if (groupObj && groupObj.children) {
      groupObj.children.forEach((q) => {
        if (q.code) {
          ids.add(q.code);
        }
      });
    }
  });
  return ids;
}

function randChar(chars) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return chars[array[0] % chars.length];
}

function generateId(existing) {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  let id = "";

  do {
    const numPart = Array.from({ length: 3 }, () => randChar(numbers)).join("");
    const letPart = Array.from({ length: 3 }, () => randChar(letters)).join("");
    id = numPart + letPart;
  } while (existing.has(id));

  return id;
}

export const nextQuestionId = (state, groups, preferredCode) => {
  const existing = collectExistingIds(state, groups);
  const bare = preferredBare(preferredCode, /^Q/);
  if (bare && !existing.has("Q" + bare)) {
    return bare;
  }
  return generateId(existing);
};

export const nextQuotaCode = (quotas) => {
  const existing = new Set(quotas.map((quota) => quota.code));
  let code;
  do {
    code = `QT${generateId(new Set())}`;
  } while (existing.has(code));
  return code;
};

export const buildFormatInstruction = (content, name, key, contentPath) => {
  const allMatches = getAllMatches(content);
  return allMatches.map((match, index) =>{
    return {
      code: `format_${name}_${key}_${index + 1}`,
      contentPath,
      text: match,
      lang: key,
    };
  })
};

const getAllMatches = (inputString) => {
  const regex = /\{\{(.*?)\}\}/g;
  return Array.from(inputString.matchAll(regex), m => m[1].trim());
};
