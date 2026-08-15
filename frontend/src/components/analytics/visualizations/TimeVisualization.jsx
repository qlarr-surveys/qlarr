import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import TemporalVisualization from './TemporalVisualization';

const extractTime = (r) => (r.includes(' ') ? r.split(' ')[1] : r);

export default function TimeVisualization({ question }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  return <TemporalVisualization question={question} extractor={extractTime} valueLabel={t('analytics.col_time')} />;
}
