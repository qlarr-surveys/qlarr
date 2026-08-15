import { transformIconMatrixSCQData } from '~/analytics/utils/dataTransformers';
import MatrixVisualization from './MatrixVisualization';

export default function IconMatrixSCQVisualization({ question }) {
  return <MatrixVisualization question={question} transformer={transformIconMatrixSCQData} useIcons />;
}
