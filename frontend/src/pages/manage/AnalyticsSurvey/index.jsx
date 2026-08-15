import React, { startTransition, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import { Box, Paper, Typography } from '@mui/material';
import { useService } from '~/hooks/use-service';
import LoadingDots from '~/components/common/LoadingDots';
import QuestionCard from '~/components/analytics/QuestionCard';
import LazyRender from '~/components/common/LazyRender';
import { getQuestionTypeLabel } from '~/components/analytics/questionTypes';
import useProgressiveList from '~/hooks/useProgressiveList';

function AnalyticsSurvey() {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const surveyService = useService('survey');
  const { surveyId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const visibleQuestions = useProgressiveList(data?.questions ?? [], 5);

  useEffect(() => {
    setLoading(true);
    surveyService
      .getAnalytics(surveyId)
      .then((data) => {
        startTransition(() => {
          setData(data);
        });
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to load analytics:', err);
        setError(err.message || t('analytics.error_loading_data'));
      })
      .finally(() => setLoading(false));
  }, [surveyId]);

  if (loading) return <LoadingDots fullHeight />;

  if (error) {
    return (
      <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, bgcolor: 'error.lighter' }}>
          <Typography variant="h6" color="error">
            {t('analytics.error_loading')}
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="body1" color="text.secondary">
            {t('analytics.no_data')}
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (data.totalResponses === 0) {
    return (
      <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3 }}>
          <Typography variant="h5">{data.surveyTitle}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('analytics.zero_responses')}
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('analytics.no_responses_title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('analytics.no_responses_detail')}
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (!data.questions || data.questions.length === 0) {
    return (
      <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3 }}>
          <Typography variant="h5">{data.surveyTitle}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('analytics.no_questions_title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('analytics.no_questions_detail')}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
      {/* Survey Header */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Typography variant="h5">{data.surveyTitle}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('analytics.questions_count', { count: data.questions.length })}
        </Typography>
      </Paper>

      {/* Question cards — rendered progressively */}
      {visibleQuestions.map((question) => (
        <Paper key={question.id} variant="outlined" sx={{ mb: 3, p: 3, borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>
            {question.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {getQuestionTypeLabel(question.type, t)}
          </Typography>
          <LazyRender>
            <QuestionCard question={question} totalResponses={data.totalResponses} incompleteResponses={data.incompleteResponses} previewResponses={data.previewResponses} />
          </LazyRender>
        </Paper>
      ))}
    </Box>
  );
}

export default React.memo(AnalyticsSurvey);
