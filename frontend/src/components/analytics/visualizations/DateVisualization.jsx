import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import TemporalVisualization from './TemporalVisualization';

const extractDate = (r) => r.split(' ')[0];

export default function DateVisualization({ question }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  return <TemporalVisualization question={question} extractor={extractDate} valueLabel={t('analytics.col_date')} />;
}
