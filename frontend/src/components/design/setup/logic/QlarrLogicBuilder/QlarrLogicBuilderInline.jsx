import React from 'react';
import { Box, Typography, Button, IconButton, Tooltip, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { AddOutlined, Close } from '@mui/icons-material';
import { useLogicBuilder } from './LogicBuilderContext';
import { InlineFieldSelector } from './components/InlineFieldSelector';
import { InlineOperatorSelector } from './components/InlineOperatorSelector';
import { ValueInput } from './components/ValueInput';
import { OPERATORS } from './config/operators';
import styles from './QlarrLogicBuilderInline.module.css';

/**
 * Inline version of QlarrLogicBuilder for sidebar display
 * Natural language style: "Show when [field] [operator] [value]"
 */
export function QlarrLogicBuilderInline() {
  const { state, dispatch, getFieldDefinition, t } = useLogicBuilder();
  const { tree } = state;

  const handleAddRule = () => {
    dispatch({ type: 'ADD_RULE' });
  };

  const handleRemoveRule = (ruleId) => {
    dispatch({ type: 'REMOVE_RULE', ruleId });
  };

  const handleConjunctionChange = (_event, newValue) => {
    if (newValue !== null) {
      dispatch({ type: 'UPDATE_CONJUNCTION', conjunction: newValue });
    }
  };

  const handleFieldChange = (ruleId, fieldCode) => {
    // Use single dispatch to set field, operator, and value together
    // This prevents intermediate invalid states from triggering saves
    const fieldDef = getFieldDefinition(fieldCode);
    dispatch({
      type: 'UPDATE_FIELD_WITH_DEFAULTS',
      ruleId,
      field: fieldCode,
      operator: fieldDef?.defaultOperator || null,
      value: null,
    });
  };

  const handleOperatorChange = (ruleId, operator) => {
    dispatch({ type: 'UPDATE_OPERATOR', ruleId, operator });

    // Clear value when changing to zero-cardinality operator
    const opDef = OPERATORS[operator];
    if (opDef?.cardinality === 0) {
      dispatch({ type: 'UPDATE_VALUE', ruleId, value: null });
    }
  };

  const handleValueChange = (ruleId, value) => {
    dispatch({ type: 'UPDATE_VALUE', ruleId, value });
  };

  return (
    <Box className={styles.container}>
      {/* Empty state with guidance */}
      {tree.children.length === 0 ? (
        <Box className={styles.emptyState}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t('logic_builder.empty_state_title')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('logic_builder.empty_state_hint')}
          </Typography>
        </Box>
      ) : (
        <>
          {/* Conjunction selector with toggle buttons */}
          {tree.children.length > 1 && (
            <Box className={styles.conjunctionRow}>
              <ToggleButtonGroup
                value={tree.conjunction}
                exclusive
                onChange={handleConjunctionChange}
                size="small"
                className={styles.toggleGroup}
              >
                <ToggleButton value="and" className={styles.toggleButton}>
                  {t('logic_builder.all')}
                </ToggleButton>
                <ToggleButton value="or" className={styles.toggleButton}>
                  {t('logic_builder.any')}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}

          {tree.children.map((rule) => {
            const operatorDef = rule.operator ? OPERATORS[rule.operator] : undefined;
            const showValue = operatorDef && operatorDef.cardinality > 0;

            return (
              <Box key={rule.id} className={styles.ruleRow}>
                {/* Selectors with equal width */}
                <Box className={styles.selectorsContainer}>
                  <Box className={styles.selectorCell}>
                    <InlineFieldSelector
                      value={rule.field}
                      onChange={(fieldCode) => handleFieldChange(rule.id, fieldCode)}
                    />
                  </Box>

                  {rule.field && (
                    <Box className={styles.selectorCell}>
                      <InlineOperatorSelector
                        fieldCode={rule.field}
                        value={rule.operator}
                        onChange={(operator) => handleOperatorChange(rule.id, operator)}
                      />
                    </Box>
                  )}

                  {rule.field && rule.operator && showValue && (
                    <Box className={styles.valueInputWrapper}>
                      <ValueInput
                        fieldCode={rule.field}
                        operator={rule.operator}
                        value={rule.value}
                        onChange={(value) => handleValueChange(rule.id, value)}
                        compact
                      />
                    </Box>
                  )}
                </Box>

              {/* Delete button */}
              <Tooltip title={t('logic_builder.delete_rule')}>
                <IconButton
                  size="small"
                  onClick={() => handleRemoveRule(rule.id)}
                  className={styles.deleteButton}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        })}
        </>
      )}

      {/* Add condition button */}
      <Box className={styles.footerRow}>
        <Button
          variant="text"
          startIcon={<AddOutlined />}
          onClick={handleAddRule}
          size="small"
        >
          {t('logic_builder.add_condition')}
        </Button>
      </Box>
    </Box>
  );
}
