import { OPERATORS, findOperatorByJsonLogicOp } from '../config/operators';

/**
 * Build a mapping from JSON Logic operator names to our operator keys
 * Generated from OPERATORS config to maintain single source of truth
 */
const JSON_LOGIC_OP_TO_KEY = Object.fromEntries(
  Object.entries(OPERATORS).map(([key, op]) => [op.jsonLogicOp, key])
);

/**
 * Log parse warnings in development mode only
 */
function logParseWarning(message, context) {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[JsonLogic Parser]', message, context);
  }
}

/**
 * Generate a unique ID for tree nodes
 */
export function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Create an empty tree with a root group
 */
export function createEmptyTree() {
  return {
    id: generateId(),
    type: 'group',
    conjunction: 'and',
    children: [],
  };
}

/**
 * Create a new empty rule
 */
export function createEmptyRule() {
  return {
    id: generateId(),
    type: 'rule',
    field: null,
    operator: null,
    value: null,
  };
}

/**
 * Convert internal tree model to JSON Logic format
 * This must produce output compatible with the existing jsonToJs() function
 */
export function treeToJsonLogic(tree) {
  const validChildren = tree.children.filter((rule) => isRuleValid(rule));

  if (validChildren.length === 0) {
    return null;
  }

  const childLogic = validChildren
    .map((rule) => ruleToJsonLogic(rule))
    .filter((logic) => logic !== null);

  if (childLogic.length === 0) {
    return null;
  }

  // If only one rule, return it directly (no wrapping conjunction)
  if (childLogic.length === 1) {
    return childLogic[0];
  }

  // Wrap multiple rules in conjunction
  return { [tree.conjunction]: childLogic };
}

/**
 * Check if a rule has all required fields
 */
function isRuleValid(rule) {
  if (!rule.field || !rule.operator) {
    return false;
  }

  const operatorDef = OPERATORS[rule.operator];
  if (!operatorDef) {
    return false;
  }

  // Zero-cardinality operators don't need a value
  if (operatorDef.cardinality === 0) {
    return true;
  }

  // Cardinality 1 needs a value
  if (operatorDef.cardinality === 1) {
    if (rule.value === null || rule.value === '') return false;
    // Empty arrays are also invalid (e.g., no options selected in a select input)
    if (Array.isArray(rule.value) && rule.value.length === 0) return false;
    return true;
  }

  // Cardinality 2 (range) needs an array of two valid values where min <= max
  if (operatorDef.cardinality === 2) {
    if (
      !Array.isArray(rule.value) ||
      rule.value.length !== 2 ||
      rule.value[0] === null ||
      rule.value[1] === null ||
      rule.value[0] === '' ||
      rule.value[1] === ''
    ) {
      return false;
    }
    const [min, max] = rule.value;
    return !(min > max);
  }

  return false;
}

/**
 * Convert a single rule to JSON Logic
 */
function ruleToJsonLogic(rule) {
  if (!rule.field || !rule.operator) {
    return null;
  }

  const operatorDef = OPERATORS[rule.operator];
  if (!operatorDef) {
    return null;
  }

  const fieldVar = { var: rule.field };

  // Zero-cardinality operators (no value needed)
  if (operatorDef.cardinality === 0) {
    return { [operatorDef.jsonLogicOp]: fieldVar };
  }

  // Single value operators
  if (operatorDef.cardinality === 1) {
    // Handle select operators - value might be an array of selected options
    if (
      rule.operator === 'select_any_in' ||
      rule.operator === 'select_not_any_in' ||
      rule.operator === 'multiselect_equals' ||
      rule.operator === 'multiselect_not_equals'
    ) {
      const values = Array.isArray(rule.value) ? rule.value : [rule.value];
      return { [operatorDef.jsonLogicOp]: [fieldVar, values] };
    }

    // Trim string values to prevent whitespace sensitivity in text comparisons
    const value = typeof rule.value === 'string' ? rule.value.trim() : rule.value;

    return { [operatorDef.jsonLogicOp]: [fieldVar, value] };
  }

  // Range operators (cardinality 2)
  if (operatorDef.cardinality === 2 && Array.isArray(rule.value)) {
    let [min, max] = rule.value;
    // Auto-swap if min > max (works for numbers and ISO date/time strings)
    if (min != null && max != null && min > max) {
      [min, max] = [max, min];
    }
    return { [operatorDef.jsonLogicOp]: [fieldVar, min, max] };
  }

  return null;
}

/**
 * Convert JSON Logic to internal tree model
 * This parses the format produced by react-awesome-query-builder
 * @param {Object} jsonLogic - The JSON Logic object to parse
 * @param {Array} fields - Optional field definitions for type-aware operator resolution
 */
export function jsonLogicToTree(jsonLogic, fields = []) {
  const root = createEmptyTree();

  if (!jsonLogic || typeof jsonLogic !== 'object') {
    return root;
  }

  // Build field type map for disambiguating operators like 'in' and 'not_in'
  const fieldTypeMap = new Map(fields.map((f) => [f.code, f.type]));

  const parsed = parseJsonLogicNode(jsonLogic, fieldTypeMap);

  if (parsed) {
    if (parsed.type === 'group') {
      return parsed;
    } else {
      // Single rule - wrap in a group
      root.children = [parsed];
    }
  }

  return root;
}

/**
 * Parse a JSON Logic node into our tree structure
 * @param {Object} node - The JSON Logic node
 * @param {Map} fieldTypeMap - Map of field codes to their types for operator disambiguation
 */
function parseJsonLogicNode(node, fieldTypeMap) {
  if (!node || typeof node !== 'object') {
    return null;
  }

  const keys = Object.keys(node);
  if (keys.length === 0) {
    return null;
  }

  const key = keys[0];
  const value = node[key];

  // Handle conjunctions (and/or)
  if (key === 'and' || key === 'or') {
    const children = value
      .map((child) => parseJsonLogicNode(child, fieldTypeMap))
      .filter((child) => child !== null && child.type === 'rule');

    return {
      id: generateId(),
      type: 'group',
      conjunction: key,
      children,
    };
  }

  // Handle operators
  return parseOperatorRule(key, value, fieldTypeMap);
}

/**
 * Parse an operator expression into a LogicRule
 * @param {string} jsonLogicOp - The JSON Logic operator name
 * @param {*} value - The operator value/arguments
 * @param {Map} fieldTypeMap - Map of field codes to their types for operator disambiguation
 */
function parseOperatorRule(jsonLogicOp, value, fieldTypeMap) {
  // Extract field code first to help disambiguate operators
  const fieldCode = Array.isArray(value)
    ? extractFieldVar(value[0])
    : extractFieldVar(value);
  const fieldType = fieldTypeMap?.get(fieldCode);

  // Resolve operator key, handling ambiguous operators based on field type
  let opKey = resolveOperatorKey(jsonLogicOp, fieldType);

  if (!opKey) {
    logParseWarning('Could not resolve operator, rule ignored', { jsonLogicOp, value });
    return null;
  }

  const rule = {
    id: generateId(),
    type: 'rule',
    field: null,
    operator: opKey,
    value: null,
  };

  // Extract field and value based on operator cardinality
  const op = OPERATORS[opKey];
  if (!op) {
    return null;
  }

  // Zero-cardinality operators: value is just { var: "field" }
  if (op.cardinality === 0) {
    const fieldVar = extractFieldVar(value);
    if (fieldVar) {
      rule.field = fieldVar;
    }
    return rule;
  }

  // Array-based operators: [{ var: "field" }, value] or [{ var: "field" }, min, max]
  if (Array.isArray(value)) {
    if (fieldCode) {
      rule.field = fieldCode;
    }

    // Range operators (cardinality 2)
    if (op.cardinality === 2 && value.length >= 3) {
      rule.value = [value[1], value[2]];
    }
    // Single value operators
    else if (value.length >= 2) {
      rule.value = value[1];
    }
  }

  return rule;
}

/**
 * Resolve the operator key from JSON Logic operator name
 * Handles ambiguous operators like 'in' and 'not_in' that map to different
 * internal operators based on field type (select vs multiselect)
 * @param {string} jsonLogicOp - The JSON Logic operator name
 * @param {string} fieldType - The field type (select, multiselect, etc.)
 * @returns {string|null} The resolved operator key
 */
function resolveOperatorKey(jsonLogicOp, fieldType) {
  // Handle ambiguous 'in' operator - used by both select and multiselect
  if (jsonLogicOp === 'in') {
    if (fieldType === 'multiselect') {
      return 'multiselect_equals';
    }
    // Default to select_any_in for 'select', 'survey_lang', or unknown types
    return 'select_any_in';
  }

  // Handle ambiguous 'not_in' operator
  if (jsonLogicOp === 'not_in') {
    if (fieldType === 'multiselect') {
      return 'multiselect_not_equals';
    }
    return 'select_not_any_in';
  }

  // For non-ambiguous operators, use standard lookup
  const operatorDef = findOperatorByJsonLogicOp(jsonLogicOp);
  if (operatorDef?.key) {
    return operatorDef.key;
  }

  return findOperatorKeyByJsonLogicOp(jsonLogicOp);
}

/**
 * Extract field name from a { var: "field" } structure
 */
function extractFieldVar(value) {
  if (
    value &&
    typeof value === 'object' &&
    'var' in value &&
    typeof value.var === 'string'
  ) {
    return value.var;
  }
  return null;
}

/**
 * Map JSON Logic operator names to our operator keys
 * Uses the generated JSON_LOGIC_OP_TO_KEY map from OPERATORS config
 */
function findOperatorKeyByJsonLogicOp(jsonLogicOp) {
  const key = JSON_LOGIC_OP_TO_KEY[jsonLogicOp];
  if (!key) {
    logParseWarning('Unknown JSON Logic operator', { jsonLogicOp });
  }
  return key || null;
}

/**
 * Deep clone a tree structure
 */
export function cloneTree(tree) {
  return JSON.parse(JSON.stringify(tree));
}
