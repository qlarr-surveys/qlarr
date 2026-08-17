import React, { Suspense, lazy, useMemo } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import NoResponsesMessage from './common/NoResponsesMessage';
import DisplayContentMessage from './common/DisplayContentMessage';
import { isDisplayType } from './questionTypes';

const SCQVisualization = lazy(() => import('./visualizations/SCQVisualization'));
const MCQVisualization = lazy(() => import('./visualizations/MCQVisualization'));
const NPSVisualization = lazy(() => import('./visualizations/NPSVisualization'));
const RankingVisualization = lazy(() => import('./visualizations/RankingVisualization'));
const NumberVisualization = lazy(() => import('./visualizations/NumberVisualization'));
const DateVisualization = lazy(() => import('./visualizations/DateVisualization'));
const TimeVisualization = lazy(() => import('./visualizations/TimeVisualization'));
const DateTimeVisualization = lazy(() => import('./visualizations/DateTimeVisualization'));
const MatrixSCQVisualization = lazy(() => import('./visualizations/MatrixSCQVisualization'));
const MatrixMCQVisualization = lazy(() => import('./visualizations/MatrixMCQVisualization'));
const TextVisualization = lazy(() => import('./visualizations/TextVisualization'));
const ParagraphVisualization = lazy(() => import('./visualizations/ParagraphVisualization'));
const EmailVisualization = lazy(() => import('./visualizations/EmailVisualization'));
const MultipleTextVisualization = lazy(() => import('./visualizations/MultipleTextVisualization'));
const AutocompleteVisualization = lazy(() => import('./visualizations/AutocompleteVisualization'));
const ImageRankingVisualization = lazy(() => import('./visualizations/ImageRankingVisualization'));
const ImageSCQVisualization = lazy(() => import('./visualizations/ImageSCQVisualization'));
const ImageMCQVisualization = lazy(() => import('./visualizations/ImageMCQVisualization'));
const IconSCQVisualization = lazy(() => import('./visualizations/IconSCQVisualization'));
const IconMCQVisualization = lazy(() => import('./visualizations/IconMCQVisualization'));
const IconMatrixSCQVisualization = lazy(() => import('./visualizations/IconMatrixSCQVisualization'));
const IconMatrixMCQVisualization = lazy(() => import('./visualizations/IconMatrixMCQVisualization'));
const FileUploadVisualization = lazy(() => import('./visualizations/FileUploadVisualization'));
const SignatureVisualization = lazy(() => import('./visualizations/SignatureVisualization'));
const MediaCaptureVisualization = lazy(() => import('./visualizations/MediaCaptureVisualization'));
const BarcodeVisualization = lazy(() => import('./visualizations/BarcodeVisualization'));

const QUESTION_TYPE_MAP = {
  SCQ: SCQVisualization,
  MCQ: MCQVisualization,
  NPS: NPSVisualization,
  RANKING: RankingVisualization,
  NUMBER: NumberVisualization,
  DATE: DateVisualization,
  TIME: TimeVisualization,
  DATE_TIME: DateTimeVisualization,
  TEXT: TextVisualization,
  PARAGRAPH: ParagraphVisualization,
  EMAIL: EmailVisualization,
  MULTIPLE_TEXT: MultipleTextVisualization,
  AUTOCOMPLETE: AutocompleteVisualization,
  IMAGE_RANKING: ImageRankingVisualization,
  ICON_SCQ: IconSCQVisualization,
  ICON_MCQ: IconMCQVisualization,
  SCQ_ARRAY: MatrixSCQVisualization,
  MCQ_ARRAY: MatrixMCQVisualization,
  SCQ_ICON_ARRAY: IconMatrixSCQVisualization,
  MCQ_ICON_ARRAY: IconMatrixMCQVisualization,
  IMAGE_SCQ: ImageSCQVisualization,
  IMAGE_MCQ: ImageMCQVisualization,
  FILE_UPLOAD: FileUploadVisualization,
  SIGNATURE: SignatureVisualization,
  PHOTO_CAPTURE: MediaCaptureVisualization,
  BARCODE: BarcodeVisualization,
};

const ICON_UPGRADE_MAP = {
  SCQ_ARRAY: IconMatrixSCQVisualization,
  MCQ_ARRAY: IconMatrixMCQVisualization,
};

function QuestionCard({ question, totalResponses, incompleteResponses, previewResponses }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const enrichedQuestion = useMemo(() => ({
    ...question,
    totalResponses,
    incompleteResponses,
    previewResponses,
  }), [question, totalResponses, incompleteResponses, previewResponses]);

  // Display-only elements (text/image/video) collect no responses — show a clean per-type state.
  if (isDisplayType(enrichedQuestion.type)) {
    return <DisplayContentMessage type={enrichedQuestion.type} />;
  }

  // Auto-upgrade matrix visualizations to icon variants when images are available
  const VisualizationComponent = (question.images?.length > 0 && ICON_UPGRADE_MAP[enrichedQuestion.type])
    || QUESTION_TYPE_MAP[enrichedQuestion.type];

  if (!VisualizationComponent) {
    return (
      <NoResponsesMessage
        message={t('analytics.no_data_available')}
        description={t('analytics.no_responses_description')}
      />
    );
  }

  const hasData = enrichedQuestion.responses?.length > 0
    || enrichedQuestion.frequencyCounts
    || enrichedQuestion.npsSummary
    || enrichedQuestion.numberSummary
    || enrichedQuestion.rankingSummary
    || enrichedQuestion.matrixSummary
    || enrichedQuestion.presenceCount;

  if (!hasData) {
    return <NoResponsesMessage />;
  }

  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>}>
      <VisualizationComponent question={enrichedQuestion} />
    </Suspense>
  );
}

export default React.memo(QuestionCard);
