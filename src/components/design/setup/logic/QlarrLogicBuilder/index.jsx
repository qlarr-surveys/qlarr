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
function InlineLogicBuilderSync({ onChange }) {
  const { state } = useLogicBuilder();
  const { tree, isDirty } = state;

  // Use ref to store onChange to avoid triggering effect when callback reference changes
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Sync local changes to parent whenever tree changes
  // Only valid rules are saved (incomplete rules are filtered by treeToJsonLogic)
  useEffect(() => {
    if (isDirty) {
      const newJsonLogic = treeToJsonLogic(tree);
      onChangeRef.current({
        jsonLogic: newJsonLogic,
        queryString: '',
        isEmpty: tree.children.length === 0,
      });
    }
  }, [tree, isDirty]);

  return <QlarrLogicBuilderInline />;
}

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
    >
      <InlineLogicBuilderSync onChange={onChange} />
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
};

InlineLogicBuilderSync.propTypes = {
  onChange: PropTypes.func.isRequired,
};
