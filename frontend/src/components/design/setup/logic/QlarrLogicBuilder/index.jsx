import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { LogicBuilderProvider, useLogicBuilder } from './LogicBuilderContext';
import { QlarrLogicBuilderInline } from './QlarrLogicBuilderInline';
import { treeToJsonLogic } from './utils/jsonLogic';

/**
 * Inner component that syncs state changes to parent
 * Component is "uncontrolled" - initializes from props but maintains its own state
 * This allows incomplete rules to exist in the UI while only saving valid rules
 */
function InlineLogicBuilderSync({ onChange, jsonLogic, initialRule, ...view }) {
  const { state, dispatch, fields } = useLogicBuilder();
  const { tree, isDirty } = state;

  // Open with a condition row (blank or prefilled) instead of the empty state
  useEffect(() => {
    if (initialRule && tree.children.length === 0) {
      dispatch({ type: 'ADD_RULE', rule: initialRule });
    }
  }, []);

  // Use ref to store onChange to avoid triggering effect when callback reference changes
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const lastEmittedRef = useRef(serialize(jsonLogic));

  // Sync local changes to parent whenever tree changes
  // Only valid rules are saved (incomplete rules are filtered by treeToJsonLogic)
  useEffect(() => {
    if (isDirty) {
      const newJsonLogic = treeToJsonLogic(tree);
      lastEmittedRef.current = serialize(newJsonLogic);
      onChangeRef.current({
        jsonLogic: newJsonLogic,
        queryString: '',
        isEmpty: tree.children.length === 0,
      });
    }
  }, [tree, isDirty]);

  useEffect(() => {
    const incoming = serialize(jsonLogic);
    if (incoming !== lastEmittedRef.current) {
      lastEmittedRef.current = incoming;
      dispatch({ type: 'LOAD_FROM_JSON_LOGIC', jsonLogic, fields });
    }
  }, [jsonLogic, dispatch, fields]);

  return <QlarrLogicBuilderInline {...view} />;
}

const serialize = (logic) => JSON.stringify(logic ?? null);

/**
 * QlarrLogicBuilderInlineWrapper - Inline version for sidebar display
 * Similar to SkipLogic component style - no dialog, displays directly in sidebar
 */
export function QlarrLogicBuilderInlineWrapper({
  code,
  jsonLogic,
  onChange,
  componentIndices,
  designState,
  mainLang,
  langList,
  t,
  includeSelf,
  initialRule,
  lead,
  emptyState,
  onManual,
  firstRule,
}) {
  return (
    <LogicBuilderProvider
      initialJsonLogic={jsonLogic}
      componentIndices={componentIndices}
      currentCode={code}
      designState={designState}
      mainLang={mainLang}
      langList={langList}
      t={t}
      includeSelf={includeSelf}
    >
      <InlineLogicBuilderSync
        onChange={onChange}
        jsonLogic={jsonLogic}
        initialRule={initialRule}
        lead={lead}
        emptyState={emptyState}
        onManual={onManual}
        firstRule={firstRule}
      />
    </LogicBuilderProvider>
  );
}

QlarrLogicBuilderInlineWrapper.propTypes = {
  code: PropTypes.string.isRequired,
  jsonLogic: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  componentIndices: PropTypes.array.isRequired,
  designState: PropTypes.object.isRequired,
  mainLang: PropTypes.string.isRequired,
  langList: PropTypes.arrayOf(PropTypes.string).isRequired,
  t: PropTypes.func.isRequired,
  includeSelf: PropTypes.bool,
  initialRule: PropTypes.object,
  lead: PropTypes.string,
  emptyState: PropTypes.bool,
  onManual: PropTypes.func,
  firstRule: PropTypes.object,
};

InlineLogicBuilderSync.propTypes = {
  onChange: PropTypes.func.isRequired,
  jsonLogic: PropTypes.object,
  initialRule: PropTypes.object,
};
