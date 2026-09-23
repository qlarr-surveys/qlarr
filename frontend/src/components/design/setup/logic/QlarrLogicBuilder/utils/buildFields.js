import {
  getFieldType,
  hasOtherOption,
  isArrayType,
  isRankingType,
} from '../config/fieldTypes';
import { accessibleDependencies } from '~/utils/design/access/dependencies';
import {
  isGroup,
  isQuestion,
  stripTags,
  buildCodeIndex,
} from '~/utils/design/pureUtils';

export const DEFAULT_FIELD_LABELS = {
  system: 'System',
  questions: 'Questions',
  pages: 'Pages',
  mode: 'Survey mode',
  language: 'Survey language',
};

export function buildLogicFields({
  componentIndices,
  currentCode,
  designState,
  mainLang,
  langList = [],
  labels = DEFAULT_FIELD_LABELS,
}) {
  const fields = [
    {
      code: 'mode',
      label: labels.mode,
      type: 'survey_mode',
      defaultOperator: 'is_online',
      group: labels.system,
    },
    {
      code: 'survey_lang',
      label: labels.language,
      type: 'survey_lang',
      defaultOperator: 'select_any_in',
      options: langList.map((lang) => ({ value: lang, label: lang })),
      group: labels.system,
    },
  ];

  const numericCodes =
    designState.index ?? (designState.Survey ? buildCodeIndex(designState) : {});

  const dependencies = accessibleDependencies(componentIndices, currentCode);
  const indexMap = new Map((componentIndices || []).map((el) => [el.code, el]));

  const sortedDependencies = [...dependencies].sort((a, b) => {
    const itemA = indexMap.get(a);
    const itemB = indexMap.get(b);

    const parentA = isGroup(a) ? itemA : indexMap.get(itemA?.parent);
    const parentB = isGroup(b) ? itemB : indexMap.get(itemB?.parent);

    const parentIndexA = parentA?.minIndex ?? Infinity;
    const parentIndexB = parentB?.minIndex ?? Infinity;
    if (parentIndexA !== parentIndexB) {
      return parentIndexA - parentIndexB;
    }

    const typeA = isGroup(a) ? 0 : 1;
    const typeB = isGroup(b) ? 0 : 1;
    if (typeA !== typeB) {
      return typeA - typeB;
    }

    return (itemA?.minIndex ?? Infinity) - (itemB?.minIndex ?? Infinity);
  });

  for (const code of sortedDependencies) {
    const component = designState[code];
    if (!component || (!isQuestion(code) && !isGroup(code))) {
      continue;
    }
    fields.push(
      ...buildFieldDefinition(
        code,
        component,
        designState,
        mainLang,
        labels,
        numericCodes
      )
    );
  }

  return fields;
}

function buildFieldDefinition(
  code,
  component,
  state,
  mainLang,
  labels,
  numericCodes = {}
) {
  const indexNum = numericCodes[code];
  const label =
    (indexNum ? `${indexNum}. ` : '') +
    stripTags(component.content?.[mainLang]?.label || '');

  if (isGroup(code)) {
    return [
      {
        code,
        label,
        numericCode: numericCodes[code] || null,
        type: 'group',
        questionType: 'group',
        defaultOperator: 'is_relevant',
        group: labels.pages,
      },
    ];
  }

  const questionType = component.type;
  const fieldType = getFieldType(questionType);
  const fields = [];

  const skipBaseField = questionType === 'multiple_text';

  if (!skipBaseField) {
    const baseField = {
      code,
      label,
      numericCode: numericCodes[code] || null,
      type:
        isRankingType(questionType) || isArrayType(questionType)
          ? 'question_state'
          : fieldType,
      questionType,
      defaultOperator: getDefaultOperatorForType(questionType, fieldType),
      group: labels.questions,
    };

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

  if (hasOtherOption(questionType)) {
    const otherField = buildOtherField(code, component, state, mainLang, label);
    if (otherField) {
      fields.push(otherField);
    }
  }

  if (isArrayType(questionType)) {
    fields.push(
      ...buildArrayRowFields(
        code,
        component,
        state,
        mainLang,
        label,
        questionType,
        numericCodes
      )
    );
  }

  if (questionType === 'multiple_text') {
    fields.push(...buildMultipleTextFields(code, component, state, mainLang, label, numericCodes));
  }

  if (isRankingType(questionType)) {
    fields.push(...buildRankingFields(code, component, state, mainLang, label, numericCodes));
  }

  return fields;
}

function buildOptions(component, state, mainLang) {
  if (!component.children) {
    return [];
  }

  return component.children.map((child) => {
    const childState = state[child.qualifiedCode];
    const childLabel = stripTags(childState?.content?.[mainLang]?.label || '');
    return {
      value: child.code,
      label: childLabel ? `${child.code} - ${childLabel}` : child.code,
    };
  });
}

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
    numericCode: null,
    type: 'text',
    questionType: 'text',
    defaultOperator: 'equal',
  };
}

function buildArrayRowFields(
  code,
  component,
  state,
  mainLang,
  parentLabel,
  questionType,
  numericCodes = {}
) {
  const columns = component.children?.filter((el) => el.type === 'column') || [];
  const columnOptions = columns.map((col) => {
    const colState = state[col.qualifiedCode];
    const colLabel = stripTags(colState?.content?.[mainLang]?.label || '');
    return {
      value: col.code,
      label: colLabel ? `${col.code} - ${colLabel}` : col.code,
    };
  });

  const rows = component.children?.filter((el) => el.type === 'row') || [];
  const questionNum = numericCodes[code];

  return rows.map((row) => {
    const rowState = state[row.qualifiedCode];
    const rowLabel = stripTags(rowState?.content?.[mainLang]?.label || '');

    return {
      code: `${code}${row.code}`,
      numericCode: numericCodes[`${code}${row.code}`] || null,
      label: questionNum
        ? `${questionNum}. ${rowLabel || row.code}`
        : rowLabel || row.code,
      type: questionType === 'mcq_array' ? 'multiselect' : 'select',
      questionType,
      defaultOperator:
        questionType === 'mcq_array' ? 'multiselect_equals' : 'select_any_in',
      options: columnOptions,
      group: parentLabel.toUpperCase(),
    };
  });
}

function buildMultipleTextFields(
  code,
  component,
  state,
  mainLang,
  parentLabel,
  numericCodes = {}
) {
  if (!component.children) {
    return [];
  }

  return component.children.map((child) => {
    const childState = state[child.qualifiedCode];
    const childLabel = stripTags(childState?.content?.[mainLang]?.label || '');

    return {
      code: `${code}${child.code}`,
      numericCode: numericCodes[`${code}${child.code}`] || null,
      label: childLabel || child.code,
      type: 'text',
      questionType: 'text',
      defaultOperator: 'equal',
      group: parentLabel.toUpperCase(),
    };
  });
}

function buildRankingFields(
  code,
  component,
  state,
  mainLang,
  parentLabel,
  numericCodes = {}
) {
  if (!component.children) {
    return [];
  }

  return component.children.map((child, index) => {
    const childState = state[child.qualifiedCode];
    const childLabel = stripTags(childState?.content?.[mainLang]?.label || '');

    return {
      code: `${code}${child.code}`,
      numericCode: numericCodes[`${code}${child.code}`] || null,
      label: `${parentLabel}-${childLabel || index + 1}`,
      type: 'number',
      questionType: 'ranking',
      defaultOperator: 'equal',
      group: stripTags(component.content?.[mainLang]?.label || ''),
    };
  });
}

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
