import { transformMatrixSCQData } from '~/analytics/utils/dataTransformers';
import MatrixVisualization from './MatrixVisualization';

export default function MatrixSCQVisualization({ question }) {
  return <MatrixVisualization question={question} transformer={transformMatrixSCQData} />;
}
