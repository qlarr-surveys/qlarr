import React, { createContext, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useLogicBuilderState } from './hooks/useLogicBuilderState';
import { useFieldConfig, getOperatorsForField } from './hooks/useFieldConfig';

// Create context with undefined default
const LogicBuilderContext = createContext(undefined);

/**
 * Provider component that wraps the logic builder and provides shared state
 */
export function LogicBuilderProvider({
  children,
  initialJsonLogic,
  componentIndices,
  currentCode,
  designState,
  mainLang,
  langList,
  t,
}) {
  // Build field configuration FIRST - needed for type-aware operator parsing
  const fields = useFieldConfig(
    componentIndices,
    currentCode,
    designState,
    mainLang,
    langList,
    t
  );

  // Initialize state hook with fields for proper operator resolution
  // This ensures ambiguous operators like 'in' are correctly mapped based on field type
  const { state, dispatch } = useLogicBuilderState(initialJsonLogic, fields);

  // Memoized field lookup
  const getFieldDefinition = useMemo(() => {
    const fieldMap = new Map(fields.map((f) => [f.code, f]));
    return (code) => fieldMap.get(code);
  }, [fields]);

  // Get operators for a field
  const getFieldOperators = useMemo(() => {
    return (fieldCode) => {
      const field = getFieldDefinition(fieldCode);
      if (!field) return [];
      return getOperatorsForField(field);
    };
  }, [getFieldDefinition]);

  // Memoize context value
  const contextValue = useMemo(
    () => ({
      state,
      dispatch,
      fields,
      getFieldDefinition,
      getOperatorsForField: getFieldOperators,
      t,
    }),
    [state, dispatch, fields, getFieldDefinition, getFieldOperators, t]
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <LogicBuilderContext.Provider value={contextValue}>
        {children}
      </LogicBuilderContext.Provider>
    </LocalizationProvider>
  );
}

/**
 * Hook to access logic builder context
 * Must be used within a LogicBuilderProvider
 */
export function useLogicBuilder() {
  const context = useContext(LogicBuilderContext);
  if (!context) {
    throw new Error(
      'useLogicBuilder must be used within a LogicBuilderProvider'
    );
  }
  return context;
}

LogicBuilderProvider.propTypes = {
  children: PropTypes.node.isRequired,
  initialJsonLogic: PropTypes.object,
  componentIndices: PropTypes.array.isRequired,
  currentCode: PropTypes.string.isRequired,
  designState: PropTypes.object.isRequired,
  mainLang: PropTypes.string.isRequired,
  langList: PropTypes.arrayOf(PropTypes.string).isRequired,
  t: PropTypes.func.isRequired,
};
