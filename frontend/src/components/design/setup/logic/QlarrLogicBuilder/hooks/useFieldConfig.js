import { useMemo } from 'react';
import {
  getFieldType,
  hasOtherOption,
  isArrayType,
  isRankingType,
} from '../config/fieldTypes';
import { OPERATORS, getOperatorsForFieldType } from '../config/operators';
import { accessibleDependencies } from '~/utils/design/access/dependencies';
import { isGroup, isQuestion, stripTags } from '~/utils/design/utils';

/**
 * Build field definitions from survey state
 * This replaces the buildFields.jsx function with a cleaner, hook-based approach
 */
export function useFieldConfig(
  componentIndices,
  currentCode,
  designState,
  mainLang,
  langList,
  t
) {
  return useMemo(() => {
    const fields = [];

    // Group labels for UI
    const groupLabels = {
      system: t('logic_builder.group_system'),
      questions: t('logic_builder.group_questions'),
      pages: t('logic_builder.group_pages'),
    };

    // System fields
    fields.push({
      code: 'mode',
      label: t('logic_builder.mode'),
      type: 'survey_mode',
      defaultOperator: 'is_online',
      group: groupLabels.system,
    });

    fields.push({
      code: 'survey_lang',
      label: t('logic_builder.language'),
      type: 'survey_lang',
      defaultOperator: 'select_any_in',
      options: langList.map((lang) => ({ value: lang, label: lang })),
      group: groupLabels.system,
    });

    // Get accessible dependencies using the existing utility
    const dependencies = accessibleDependencies(componentIndices, currentCode);

    // Build index lookup map for O(1) access during sort
    const indexMap = new Map(
      componentIndices.map((el) => [el.code, el])
    );

    // Sort dependencies hierarchically: group, then its children, then next group
    const sortedDependencies = [...dependencies].sort((a, b) => {
      const itemA = indexMap.get(a);
      const itemB = indexMap.get(b);

      // Get parent group's minIndex (for questions) or own minIndex (for groups)
      const parentA = isGroup(a) ? itemA : indexMap.get(itemA?.parent);
      const parentB = isGroup(b) ? itemB : indexMap.get(itemB?.parent);

      const parentIndexA = parentA?.minIndex ?? Infinity;
      const parentIndexB = parentB?.minIndex ?? Infinity;

      // First: sort by parent group
      if (parentIndexA !== parentIndexB) {
        return parentIndexA - parentIndexB;
      }

      // Second: groups before their children
      const typeA = isGroup(a) ? 0 : 1;
      const typeB = isGroup(b) ? 0 : 1;
      if (typeA !== typeB) {
        return typeA - typeB;
      }

      // Third: by own index within group
      return (itemA?.minIndex ?? Infinity) - (itemB?.minIndex ?? Infinity);
    });

    // Build fields for each dependency
    for (const code of sortedDependencies) {
      const component = designState[code];
      if (!component || (!isQuestion(code) && !isGroup(code))) {
        continue;
      }

      const builtFields = buildFieldDefinition(
        code,
        component,
        designState,
        mainLang,
        groupLabels
      );
      fields.push(...builtFields);
    }

    return fields;
  }, [componentIndices, currentCode, designState, mainLang, langList, t]);
}

/**
 * Build field definition(s) for a component
 */
function buildFieldDefinition(code, component, state, mainLang, groupLabels) {
  const indexNum = state.index[code];
  const label =
    (indexNum ? `${indexNum}. ` : '') +
    stripTags((component.content?.[mainLang]?.label) || '');

  // Groups have limited operators
  if (isGroup(code)) {
    return [
      {
        code,
        label,
        type: 'group',
        questionType: 'group',
        defaultOperator: 'is_relevant',
        group: groupLabels.pages,
      },
    ];
  }

  const questionType = component.type;
  const fieldType = getFieldType(questionType);
  const fields = [];

  // These types don't have a base field - only sub-fields
  const skipBaseField = questionType === 'multiple_text';

  if (!skipBaseField) {
    const baseField = {
      code,
      label,
      type: (isRankingType(questionType) || isArrayType(questionType)) ? 'question_state' : fieldType,
      questionType,
      defaultOperator: getDefaultOperatorForType(questionType, fieldType),
      group: groupLabels.questions,
    };

    // Add options based on field/question type
    if (questionType === 'nps') {
      baseField.options = Array.from({ length: 11 }, (_, i) => ({
        value: String(i),
        label: String(i),
      }));
    } else if (fieldType === 'select' || fieldType === 'multiselect') {
      baseField.options = buildOptions(component, state, mainLang);
    }

    fields.push(baseField);
  }

  // Handle "other" text field for SCQ/MCQ
  if (hasOtherOption(questionType)) {
    const otherField = buildOtherField(code, component, state, mainLang, label);
    if (otherField) {
      fields.push(otherField);
    }
  }

  // Handle array types (scq_array, mcq_array)
  if (isArrayType(questionType)) {
    const rowFields = buildArrayRowFields(
      code,
      component,
      state,
      mainLang,
      label,
      questionType
    );
    fields.push(...rowFields);
  }

  // Handle multiple text
  if (questionType === 'multiple_text') {
    const textFields = buildMultipleTextFields(
      code,
      component,
      state,
      mainLang,
      label
    );
    fields.push(...textFields);
  }

  // Handle ranking
  if (isRankingType(questionType)) {
    const rankFields = buildRankingFields(code, component, state, mainLang, label);
    fields.push(...rankFields);
  }

  return fields;
}

/**
 * Build options for select/multiselect fields
 */
function buildOptions(component, state, mainLang) {
  if (!component.children) {
    return [];
  }

  return component.children
    .map((child) => {
      const childState = state[child.qualifiedCode];
      const childLabel = stripTags(childState?.content?.[mainLang]?.label || '');
      return {
        value: child.code,
        label: childLabel ? `${child.code} - ${childLabel}` : child.code,
      };
    });
}

/**
 * Build the "other" text field for SCQ/MCQ
 */
function buildOtherField(code, component, state, mainLang, parentLabel) {
  const otherChild = component.children?.find((el) => el.code === 'Aother');
  if (!otherChild) {
    return null;
  }

  const otherState = state[otherChild.qualifiedCode];
  const textChild = otherState?.children?.find((el) => el.code === 'Atext');
  if (!textChild) {
    return null;
  }

  const otherLabel = stripTags(otherState?.content?.[mainLang]?.label || '');

  return {
    code: `${code}AotherAtext`,
    label: `${parentLabel} [${otherLabel}]`,
    type: 'text',
    questionType: 'text',
    defaultOperator: 'equal',
  };
}

/**
 * Build row fields for array questions
 */
function buildArrayRowFields(
  code,
  component,
  state,
  mainLang,
  parentLabel,
  questionType
) {
  const fields = [];

  // Get column options
  const columns = component.children?.filter((el) => el.type === 'column') || [];
  const columnOptions = columns.map((col) => {
    const colState = state[col.qualifiedCode];
    const colLabel = stripTags(colState?.content?.[mainLang]?.label || '');
    return {
      value: col.code,
      label: colLabel ? `${col.code} - ${colLabel}` : col.code,
    };
  });

  // Create field for each row
  const rows = component.children?.filter((el) => el.type === 'row') || [];

  for (const row of rows) {
    const rowState = state[row.qualifiedCode];
    const rowLabel = stripTags(rowState?.content?.[mainLang]?.label || '');
    const questionNum = state.index[code];

    fields.push({
      code: `${code}${row.code}`,
      label: questionNum ? `${questionNum}. ${rowLabel || row.code}` : (rowLabel || row.code),
      type: questionType === 'mcq_array' ? 'multiselect' : 'select',
      questionType,
      defaultOperator:
        questionType === 'mcq_array' ? 'multiselect_equals' : 'select_any_in',
      options: columnOptions,
      group: parentLabel.toUpperCase(),
    });
  }

  return fields;
}

/**
 * Build text fields for multiple_text questions
 */
function buildMultipleTextFields(code, component, state, mainLang, parentLabel) {
  if (!component.children) {
    return [];
  }

  return component.children.map((child) => {
    const childState = state[child.qualifiedCode];
    const childLabel = stripTags(childState?.content?.[mainLang]?.label || '');

    return {
      code: `${code}${child.code}`,
      label: childLabel || child.code,
      type: 'text',
      questionType: 'text',
      defaultOperator: 'equal',
      group: parentLabel.toUpperCase(),
    };
  });
}

/**
 * Build number fields for ranking questions
 */
function buildRankingFields(code, component, state, mainLang, parentLabel) {
  if (!component.children) {
    return [];
  }

  return component.children.map((child, index) => {
    const childState = state[child.qualifiedCode];
    const childLabel = stripTags(childState?.content?.[mainLang]?.label || '');

    return {
      code: `${code}${child.code}`,
      label: `${parentLabel}-${childLabel || index + 1}`,
      type: 'number',
      questionType: 'ranking',
      defaultOperator: 'equal',
      group: stripTags(component.content?.[mainLang]?.label || ''),
    };
  });
}

/**
 * Get default operator for a question/field type
 */
function getDefaultOperatorForType(questionType, fieldType) {
  const typeDefaults = {
    file_upload: 'is_not_empty',
    signature: 'is_not_empty',
    photo_capture: 'is_not_empty',
    video_capture: 'is_not_empty',
    paragraph: 'like',
    date: 'greater_or_equal',
    time: 'greater_or_equal',
    date_time: 'greater_or_equal',
    ranking: 'is_relevant',
    image_ranking: 'is_relevant',
    scq_array: 'is_relevant',
    mcq_array: 'is_relevant',
    scq_icon_array: 'is_relevant',
  };

  if (typeDefaults[questionType]) {
    return typeDefaults[questionType];
  }

  const fieldDefaults = {
    text: 'equal',
    number: 'equal',
    select: 'select_any_in',
    multiselect: 'multiselect_equals',
    date: 'greater_or_equal',
    time: 'greater_or_equal',
    datetime: 'greater_or_equal',
    file: 'is_not_empty',
    group: 'is_relevant',
    survey_mode: 'is_online',
    survey_lang: 'select_any_in',
    question_state: 'is_relevant',
  };

  return fieldDefaults[fieldType] || 'equal';
}

/**
 * Get operators for a specific field
 */
export function getOperatorsForField(field) {
  return getOperatorsForFieldType(field.type);
}
