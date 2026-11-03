import { useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';

/** Answer filters: each narrows the base to respondents who picked any of its categories. */
export default function CrosstabFilters({ catalogue, config, updateConfig }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const vars = catalogue.rowVariables ?? [];
  const byId = new Map(vars.map((v) => [v.id, v]));
  const used = new Set(config.filters.map((f) => f.var));
  const available = vars.filter((v) => !used.has(v.id));

  const addFilter = (id) => {
    setMenuAnchor(null);
    updateConfig({ type: 'ADD_FILTER', var: id });
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="caption" color="text.secondary">
        {t('crosstabs.filters', 'Filters')}
      </Typography>

      <Stack spacing={1.5} sx={{ mt: 1 }}>
        {config.filters.map((f, index) => {
          const v = byId.get(f.var);
          if (!v) return null;
          const selected = v.categories.filter((c) => f.codes.includes(c.code));
          return (
            <Stack key={f.var} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Autocomplete
                multiple
                size="small"
                fullWidth
                disableCloseOnSelect
                options={v.categories}
                value={selected}
                getOptionLabel={(c) => c.label}
                isOptionEqualToValue={(a, b) => a.code === b.code}
                onChange={(_, value) =>
                  updateConfig({
                    type: 'SET_FILTER_CODES',
                    index,
                    codes: value.map((c) => c.code),
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={v.label}
                    placeholder={selected.length ? '' : t('crosstabs.filter_any_of', 'Any of…')}
                  />
                )}
              />
              <IconButton
                size="small"
                aria-label={t('crosstabs.remove_filter', 'Remove filter')}
                onClick={() => updateConfig({ type: 'REMOVE_FILTER', index })}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          );
        })}
      </Stack>

      <Button
        size="small"
        startIcon={<AddIcon />}
        sx={{ mt: config.filters.length ? 1 : 0.5 }}
        disabled={available.length === 0}
        onClick={(e) => setMenuAnchor(e.currentTarget)}
      >
        {t('crosstabs.add_filter', 'Add filter')}
      </Button>
      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{ sx: { maxHeight: 360 } }}
      >
        {available.map((v) => (
          <MenuItem key={v.id} onClick={() => addFilter(v.id)}>
            {v.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
