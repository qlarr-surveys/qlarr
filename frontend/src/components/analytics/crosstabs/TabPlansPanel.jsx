import {
  Box,
  Button,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';

/** Session-persisted (localStorage) saved crosstab configurations. */
export default function TabPlansPanel({ plans, activePlanId, onSelect, onNew, onDelete }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
        {t('crosstabs.saved_plans', 'Saved tab plans')}
      </Typography>

      {plans.length === 0 ? (
        <Typography variant="body2" color="text.disabled" sx={{ p: 1 }}>
          {t('crosstabs.no_plans', 'No saved plans yet.')}
        </Typography>
      ) : (
        <List dense disablePadding sx={{ mt: 0.5 }}>
          {plans.map((plan) => (
            <ListItemButton
              key={plan.id}
              selected={plan.id === activePlanId}
              onClick={() => onSelect(plan)}
              sx={{ borderRadius: 1 }}
            >
              <ListItemText primary={plan.name} primaryTypographyProps={{ noWrap: true }} />
              <IconButton
                edge="end"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(plan.id);
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </ListItemButton>
          ))}
        </List>
      )}

      <Box sx={{ mt: 1 }}>
        <Button fullWidth size="small" variant="outlined" onClick={onNew}>
          {t('crosstabs.new_plan', 'New tab plan')}
        </Button>
      </Box>
    </Paper>
  );
}
