import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';

const normalize = (name) => name.trim().toLocaleLowerCase();

/** `base`, or `base (2)`, `base (3)`… — the first not in `existingNames`. */
const freeName = (base, existingNames) => {
  const taken = new Set(existingNames.map(normalize));
  let name = base;
  for (let n = 2; taken.has(normalize(name)); n += 1) name = `${base} (${n})`;
  return name;
};

/** Name a tab plan before saving; names must be unique (trimmed, case-insensitive). */
export default function SavePlanDialog({ open, defaultName, existingNames, onCancel, onSave }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const [name, setName] = useState(defaultName);

  // Only on open: `existingNames` is a new array every render.
  useEffect(() => {
    if (open) setName(freeName(defaultName, existingNames));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultName]);

  const taken = existingNames.some((n) => normalize(n) === normalize(name));
  const canSave = name.trim() !== '' && !taken;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (canSave) onSave(name.trim());
  };

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
      <form onSubmit={handleSubmit}>
        <DialogTitle>{t('crosstabs.save_plan', 'Save tab plan')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            margin="dense"
            label={t('crosstabs.plan_name', 'Plan name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => e.target.select()}
            error={taken}
            helperText={
              taken ? t('crosstabs.plan_name_taken', 'A plan with this name already exists.') : ' '
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancel} color="inherit">
            {t('action_btn.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={!canSave}>
            {t('action_btn.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
