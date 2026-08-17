import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import TemporalVisualization from './TemporalVisualization';

const extractDateTime = (r) => r;

export default function DateTimeVisualization({ question }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  return <TemporalVisualization question={question} extractor={extractDateTime} valueLabel={t('analytics.col_date_time')} />;
}
