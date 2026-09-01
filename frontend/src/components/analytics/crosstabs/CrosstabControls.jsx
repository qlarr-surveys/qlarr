import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';

/** Row/Column/Weight selectors + display toggles + export/save actions. */
export default function CrosstabControls({
  catalogue,
  config,
  updateConfig,
  onExport,
  onSavePlan,
  canExport,
}) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const rowVars = catalogue.rowVariables ?? [];
  const colVars = catalogue.colVariables ?? [];

  const toggle = (key) => (e) =>
    updateConfig({ type: 'SET_OPTION', key, value: e.target.checked });

  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <TextField
          select
          size="small"
          label={t('crosstabs.rows', 'Rows')}
          value={config.rowVar ?? ''}
          onChange={(e) => updateConfig({ type: 'SET_ROW', value: e.target.value })}
        >
          {rowVars.map((v) => (
            <MenuItem key={v.id} value={v.id}>
              {v.label}
              {v.multi ? ` ${t('crosstabs.multi_tag', '(multi)')}` : ''}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label={t('crosstabs.columns', 'Columns (banner)')}
          value={config.colVar ?? ''}
          onChange={(e) => updateConfig({ type: 'SET_COL', value: e.target.value })}
        >
          {colVars.map((v) => (
            <MenuItem key={v.code} value={v.code}>
              {v.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label={t('crosstabs.weight', 'Weight')}
          value={config.weightVar ?? ''}
          onChange={(e) =>
            updateConfig({ type: 'SET_WEIGHT', value: e.target.value })
          }
        >
          <MenuItem value="">{t('crosstabs.weight_none', 'None')}</MenuItem>
          {colVars.map((v) => (
            <MenuItem key={v.code} value={v.code}>
              {v.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Stack
        direction="row"
        sx={{ mt: 2, alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
      >
        <FormControlLabel
          control={
            <Checkbox size="small" checked={config.options.counts} onChange={toggle('counts')} />
          }
          label={t('crosstabs.counts', 'Counts')}
        />
        <FormControlLabel
          control={
            <Checkbox size="small" checked={config.options.pct} onChange={toggle('pct')} />
          }
          label={t('crosstabs.column_pct', 'Column %')}
        />
        <FormControlLabel
          control={
            <Checkbox size="small" checked={config.options.significance} onChange={toggle('significance')} />
          }
          label={t('crosstabs.significance', 'Significance (95%)')}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Button size="small" variant="outlined" onClick={onExport} disabled={!canExport}>
          {t('crosstabs.export_csv', 'Export CSV')}
        </Button>
        <Button size="small" variant="contained" onClick={onSavePlan}>
          {t('crosstabs.save_plan', 'Save tab plan')}
        </Button>
      </Stack>
    </Box>
  );
}
