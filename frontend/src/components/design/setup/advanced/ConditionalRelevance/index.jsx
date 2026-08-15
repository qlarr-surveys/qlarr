import { Box, Button, IconButton, TextField, Typography } from "@mui/material";
import React from "react";
import { useConditionalRelevance } from "./useConditionalRelevance";
import styles from "../shared.module.css";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

function ConditionalRelevance({ code, t }) {
  const { conditionalRelevance, errors, onDelete, onTextChange, onAdd } =
    useConditionalRelevance(code);

  return (
    <>
      {!conditionalRelevance ? (
        <Box sx={{ my: 2 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={onAdd}
            size="small"
          >
            {t("add_conditional_relevance")}
          </Button>
        </Box>
      ) : (
        <Box className={styles.instructionCard}>
          <Box className={styles.instructionHeader}>
            <Typography fontWeight={600}>conditional relevance</Typography>
            <IconButton size="small" onClick={onDelete}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>

          <TextField
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            size="small"
            placeholder={t("conditional_relevance_text_placeholder")}
            value={conditionalRelevance.text || ""}
            onChange={(e) => onTextChange(e.target.value)}
            sx={{ mt: 1 }}
            error={errors.length > 0}
          />
          {errors.map((err, i) => (
            <Typography key={i} variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
              {err.message}
            </Typography>
          ))}
        </Box>
      )}
    </>
  );
}

export default ConditionalRelevance;
