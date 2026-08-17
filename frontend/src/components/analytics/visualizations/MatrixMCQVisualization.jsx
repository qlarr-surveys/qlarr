import { transformMatrixMCQData } from '~/analytics/utils/dataTransformers';
import MatrixVisualization from './MatrixVisualization';

export default function MatrixMCQVisualization({ question }) {
  return <MatrixVisualization question={question} transformer={transformMatrixMCQData} showAvgSelections />;
}
