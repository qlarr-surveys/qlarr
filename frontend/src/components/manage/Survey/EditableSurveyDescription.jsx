import { Box, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import { useState } from "react";
import styles from "./Survey.module.css";
import { truncateWithEllipsis } from "~/utils/design/utils";
import { Edit, Check } from "@mui/icons-material";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

export const EditableSurveyDescription = ({
  survey,
  onSave,
  isEditable = true,
}) => {
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);
  const [description, setDescription] = useState(survey.description);
  const { t } = useTranslation(NAMESPACES.MANAGE);

  const charLimit = 125;

  const handleDescriptionChange = (event) => {
    setDescription(event.target.value);
  };

  const handleSave = () => {
    if (description !== survey.description) {
      onSave(description, () => setDescription(survey.description));
    }
    setIsDescriptionEditing(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleSave();
    }
  };

  const handleEditClick = (event) => {
    event.stopPropagation();
    setIsDescriptionEditing(true);
  };

  return (
    <Box className={styles.descriptionContainer}>
      {isDescriptionEditing ? (
        <>
          <TextField
            sx={{ px: 3 }}
            value={description}
            onChange={handleDescriptionChange}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            autoFocus
            variant="standard"
            fullWidth
            multiline
            rows={3}
          />
          <IconButton
            className={`${styles.saveIcon}`}
            onClick={handleSave}
            sx={{ ml: 1 }}
          >
            <Check sx={{ color: "gray" }} />
          </IconButton>
        </>
      ) : (
        <>
          {isEditable && <Box gap={1} pl={1} display="flex" alignItems="center">
            <CustomTooltip body={t(`tooltips.survey_description`)} />
          </Box>}

          {description?.length > charLimit ? (
            <CustomTooltip body={description}
            
            showIcon={false}>
              <Typography
                variant="caption"
                onClick={isEditable ? handleEditClick : undefined}
                sx={{
                  pr: 3,
                  pl: 1,
                  color: description ? "inherit" : "gray",
                  flexGrow: 1,
                  cursor: isEditable ? "pointer" : "default",
                }}
                className={styles.truncatedText}
              >
                {truncateWithEllipsis(description, charLimit)}
              </Typography>
            </CustomTooltip>
          ) : (
            <Typography
              variant="caption"
              onClick={isEditable ? handleEditClick : undefined}
              sx={{
                pr: 3,
                pl: 1,
                color: description ? "inherit" : "gray",
                flexGrow: 1,
                cursor: isEditable ? "pointer" : "default",
              }}
              className={styles.truncatedText}
            >
              {truncateWithEllipsis(description, charLimit) ||
                ( isEditable ? t("survey.description_placeholder") : "")}
            </Typography>
          )}
          {isEditable && (
            <IconButton
              className={`${styles.descriptionIcon}`}
              onClick={handleEditClick}
              sx={{ ml: 1 }}
            >
              <Edit sx={{ color: "gray" }} />
            </IconButton>
          )}
        </>
      )}
    </Box>
  );
};
