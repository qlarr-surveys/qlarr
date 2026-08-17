import { Box, Typography } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';

export default function NoResponsesMessage({
  message,
  description,
}) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        px: 3,
      }}
    >
      <BarChartIcon
        sx={{
          fontSize: 48,
          color: 'text.disabled',
          mb: 2,
        }}
      />
      <Typography
        variant="h6"
        sx={{
          color: 'text.secondary',
          fontWeight: 500,
          mb: 0.5,
        }}
      >
        {message || t('analytics.no_responses_yet')}
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: 'text.disabled' }}
      >
        {description || t('analytics.no_responses_description')}
      </Typography>
    </Box>
  );
}
