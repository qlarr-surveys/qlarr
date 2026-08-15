import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import ChartContainer from '../common/ChartContainer';
import { StatsRow } from '../common/StatCard';
import { transformSignatureData } from '~/analytics/utils/dataTransformers';

export default function SignatureVisualization({ question }) {
  const data = useMemo(() => transformSignatureData(question), [question]);
  const { t } = useTranslation(NAMESPACES.MANAGE);

  const stats = [
    { label: t('analytics.stat_signed'), value: data.signed },
    { label: t('analytics.stat_unsigned'), value: data.unsigned },
    { label: t('analytics.completion_rate'), value: `${data.completionRate}%` },
  ];

  return (
    <ChartContainer>
      <StatsRow stats={stats} columns={3} />
    </ChartContainer>
  );
}
