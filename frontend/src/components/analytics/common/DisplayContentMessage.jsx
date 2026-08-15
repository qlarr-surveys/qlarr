import { Box, Typography } from '@mui/material';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ImageIcon from '@mui/icons-material/Image';
import VideocamIcon from '@mui/icons-material/Videocam';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';

// Per-type icon for display-only elements. The header already shows the human label,
// so the body keeps a shared message and varies only the icon.
const ICON_BY_TYPE = {
  TEXT_DISPLAY: TextFieldsIcon,
  IMAGE_DISPLAY: ImageIcon,
  VIDEO_DISPLAY: VideocamIcon,
};

export default function DisplayContentMessage({ type }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const Icon = ICON_BY_TYPE[type] || InfoOutlinedIcon;
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
      <Icon
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
        {t('analytics.display_only_title')}
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: 'text.disabled', textAlign: 'center' }}
      >
        {t('analytics.display_only_description')}
      </Typography>
    </Box>
  );
}
