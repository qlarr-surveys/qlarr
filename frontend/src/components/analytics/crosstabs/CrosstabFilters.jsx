import { useId, useState } from 'react';
import { Autocomplete, Menu, MenuItem, TextField } from '@mui/material';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import styles from './Crosstabs.module.css';

// The rail's select look on MUI's outlined input.
const INPUT_SX = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    bgcolor: '#fff',
    font: '400 14px Rubik, sans-serif',
    color: '#1b2150',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#cfd5e8',
    borderWidth: '1.5px',
  },
  '& .MuiInputLabel-root': {
    font: '400 14px Rubik, sans-serif',
    color: '#5b6189',
  },
};

/** Answer filters: each narrows the base to respondents who picked any of its categories. */
export default function CrosstabFilters({
  catalogue,
  config,
  updateConfig,
  nameOf,
}) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const titleId = useId();
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
    <div role="group" aria-labelledby={titleId} className={styles.field}>
      <span id={titleId}>{t('crosstabs.filters', 'Filters')}</span>

      {config.filters.length > 0 && (
        <ul className={styles.filterList}>
          {config.filters.map((f, index) => {
            const v = byId.get(f.var);
            if (!v) return null;
            const selected = v.categories.filter((c) =>
              f.codes.includes(c.code),
            );
            return (
              <li key={f.var} className={styles.filterRow}>
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
                  sx={INPUT_SX}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      label={nameOf(v.id, v.label)}
                      placeholder={
                        selected.length
                          ? ''
                          : t('crosstabs.filter_any_of', 'Any of…')
                      }
                    />
                  )}
                />
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label={t('crosstabs.remove_filter', 'Remove filter')}
                  onClick={() => updateConfig({ type: 'REMOVE_FILTER', index })}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        className={styles.link}
        disabled={available.length === 0}
        aria-haspopup="menu"
        onClick={(e) => setMenuAnchor(e.currentTarget)}
      >
        <Plus size={15} aria-hidden="true" />
        {t('crosstabs.add_filter', 'Add filter')}
      </button>
      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{ sx: { maxHeight: 360 } }}
      >
        {available.map((v) => (
          <MenuItem key={v.id} onClick={() => addFilter(v.id)}>
            {nameOf(v.id, v.label)}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}
