import { useMemo } from 'react';
import { getOperatorsForFieldType } from '../config/operators';
import { buildLogicFields } from '../utils/buildFields';

export function useFieldConfig(
  componentIndices,
  currentCode,
  designState,
  mainLang,
  langList,
  t
) {
  return useMemo(
    () =>
      buildLogicFields({
        componentIndices,
        currentCode,
        designState,
        mainLang,
        langList,
        labels: {
          system: t('logic_builder.group_system'),
          questions: t('logic_builder.group_questions'),
          pages: t('logic_builder.group_pages'),
          mode: t('logic_builder.mode'),
          language: t('logic_builder.language'),
        },
      }),
    [componentIndices, currentCode, designState, mainLang, langList, t]
  );
}

export function getOperatorsForField(field) {
  return getOperatorsForFieldType(field.type);
}
