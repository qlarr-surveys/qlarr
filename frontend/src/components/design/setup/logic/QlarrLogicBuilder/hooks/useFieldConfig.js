import { useMemo } from 'react';
import { getOperatorsForFieldType } from '@qlarr/design-core/logic/operators';
import { buildLogicFields } from '@qlarr/design-core/logic/buildFields';

export function useFieldConfig(
  componentIndices,
  currentCode,
  designState,
  mainLang,
  langList,
  t,
  includeSelf,
  includeCopies
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
        includeSelf,
        includeCopies,
      }),
    [componentIndices, currentCode, designState, mainLang, langList, t, includeSelf, includeCopies]
  );
}

export function getOperatorsForField(field) {
  return getOperatorsForFieldType(field.type);
}
