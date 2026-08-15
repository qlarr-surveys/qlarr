import { useReducer, useCallback } from 'react';
import {
  createEmptyTree,
  createEmptyRule,
  jsonLogicToTree,
} from '../utils/jsonLogic';

/**
 * Initial state factory
 * @param {Object} params - Initialization parameters
 * @param {Object} params.jsonLogic - The JSON Logic to parse
 * @param {Array} params.fields - Field definitions for type-aware parsing
 */
function createInitialState({ jsonLogic, fields }) {
  const tree = jsonLogic ? jsonLogicToTree(jsonLogic, fields || []) : createEmptyTree();

  return {
    tree,
    isDirty: false,
  };
}

/**
 * Main reducer for logic builder state
 */
function logicReducer(state, action) {
  switch (action.type) {
    case 'ADD_RULE': {
      const newRule = createEmptyRule();
      return {
        ...state,
        tree: {
          ...state.tree,
          children: [...state.tree.children, newRule],
        },
        isDirty: true,
      };
    }

    case 'REMOVE_RULE': {
      return {
        ...state,
        tree: {
          ...state.tree,
          children: state.tree.children.filter(
            (rule) => rule.id !== action.ruleId
          ),
        },
        isDirty: true,
      };
    }

    case 'UPDATE_CONJUNCTION': {
      return {
        ...state,
        tree: {
          ...state.tree,
          conjunction: action.conjunction,
        },
        isDirty: true,
      };
    }

    case 'UPDATE_FIELD': {
      return {
        ...state,
        tree: {
          ...state.tree,
          children: state.tree.children.map((rule) =>
            rule.id === action.ruleId
              ? { ...rule, field: action.field, operator: null, value: null }
              : rule
          ),
        },
        isDirty: true,
      };
    }

    case 'UPDATE_FIELD_WITH_DEFAULTS': {
      return {
        ...state,
        tree: {
          ...state.tree,
          children: state.tree.children.map((rule) =>
            rule.id === action.ruleId
              ? { ...rule, field: action.field, operator: action.operator, value: action.value }
              : rule
          ),
        },
        isDirty: true,
      };
    }

    case 'UPDATE_OPERATOR': {
      return {
        ...state,
        tree: {
          ...state.tree,
          children: state.tree.children.map((rule) =>
            rule.id === action.ruleId
              ? { ...rule, operator: action.operator, value: null }
              : rule
          ),
        },
        isDirty: true,
      };
    }

    case 'UPDATE_VALUE': {
      return {
        ...state,
        tree: {
          ...state.tree,
          children: state.tree.children.map((rule) =>
            rule.id === action.ruleId
              ? { ...rule, value: action.value }
              : rule
          ),
        },
        isDirty: true,
      };
    }

    case 'LOAD_FROM_JSON_LOGIC': {
      const tree = action.jsonLogic
        ? jsonLogicToTree(action.jsonLogic, action.fields || [])
        : createEmptyTree();
      return {
        tree,
        isDirty: false,
      };
    }

    case 'CLEAR_ALL': {
      return {
        ...state,
        tree: createEmptyTree(),
        isDirty: true,
      };
    }

    default:
      return state;
  }
}

/**
 * Hook for managing logic builder state
 * @param {Object} initialJsonLogic - The initial JSON Logic to parse
 * @param {Array} fields - Field definitions for type-aware operator parsing
 */
export function useLogicBuilderState(initialJsonLogic, fields = []) {
  const [state, dispatch] = useReducer(
    logicReducer,
    { jsonLogic: initialJsonLogic, fields },
    createInitialState
  );

  // Memoized action creators
  const addRule = useCallback(() => {
    dispatch({ type: 'ADD_RULE' });
  }, []);

  const removeRule = useCallback((ruleId) => {
    dispatch({ type: 'REMOVE_RULE', ruleId });
  }, []);

  const updateConjunction = useCallback((conjunction) => {
    dispatch({ type: 'UPDATE_CONJUNCTION', conjunction });
  }, []);

  const updateField = useCallback((ruleId, field) => {
    dispatch({ type: 'UPDATE_FIELD', ruleId, field });
  }, []);

  const updateOperator = useCallback((ruleId, operator) => {
    dispatch({ type: 'UPDATE_OPERATOR', ruleId, operator });
  }, []);

  const updateValue = useCallback((ruleId, value) => {
    dispatch({ type: 'UPDATE_VALUE', ruleId, value });
  }, []);

  const loadFromJsonLogic = useCallback((jsonLogic, fields = []) => {
    dispatch({ type: 'LOAD_FROM_JSON_LOGIC', jsonLogic, fields });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  return {
    state,
    dispatch,
    actions: {
      addRule,
      removeRule,
      updateConjunction,
      updateField,
      updateOperator,
      updateValue,
      loadFromJsonLogic,
      clearAll,
    },
  };
}
