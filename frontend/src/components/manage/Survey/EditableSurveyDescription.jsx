import { Box, IconButton, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import styles from "./Survey.module.css";
import { truncateWithEllipsis } from "~/utils/design/utils";
import { Check, Pencil } from "lucide-react";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

export const EditableSurveyDescription = ({
  survey,
  onSave,
  isEditable = true,
}) => {
  // A survey with no description comes back as null, which React treats as an
  // uncontrolled textarea. Normalise to "" and compare against the same
  // normalisation, so merely opening and closing the editor saves nothing.
  const savedDescription = survey.description ?? "";

  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);
  const [description, setDescription] = useState(savedDescription);
  const { t } = useTranslation(NAMESPACES.MANAGE);

  const charLimit = 125;

  // See EditableSurveyTitle: follow the prop, and leave isDescriptionEditing out
  // of the dependencies so the text does not flash back mid-save.
  useEffect(() => {
    if (!isDescriptionEditing) {
      setDescription(savedDescription);
    }
  }, [savedDescription]);

  const handleDescriptionChange = (event) => {
    setDescription(event.target.value);
  };

  const handleSave = () => {
    if (description !== savedDescription) {
      onSave(description, () => setDescription(savedDescription));
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

  const shown = truncateWithEllipsis(description, charLimit);
  const text = (
    <Typography
      variant="caption"
      onClick={isEditable ? handleEditClick : undefined}
      className={styles.descriptionText}
      sx={{
        color: description ? "inherit" : "gray",
        cursor: isEditable ? "pointer" : "default",
      }}
    >
      {shown || (isEditable ? t("survey.description_placeholder") : "")}
    </Typography>
  );

  return (
    <Box className={styles.descriptionContainer}>
      {/* The ⓘ and the edit button stay mounted in both states. Swapping the
          whole row for the textarea was what made the card jump while you
          typed, and made the ⓘ vanish exactly when the hint was wanted. */}
      {isEditable && (
        <Box className={styles.rowInfo}>
          <CustomTooltip body={t(`tooltips.survey_description`)} />
        </Box>
      )}

      {isDescriptionEditing ? (
        <TextField
          className={styles.descriptionField}
          value={description}
          onChange={handleDescriptionChange}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          autoFocus
          variant="standard"
          InputProps={{ disableUnderline: true }}
          fullWidth
          multiline
          rows={2}
        />
      ) : description?.length > charLimit ? (
        <CustomTooltip body={description} showIcon={false}>
          {text}
        </CustomTooltip>
      ) : (
        text
      )}

      {isEditable && (
        <IconButton
          className={styles.descriptionIcon}
          aria-label={t(
            isDescriptionEditing ? "action_btn.save" : "edit_survey.edit_description"
          )}
          onClick={isDescriptionEditing ? handleSave : handleEditClick}
        >
          {isDescriptionEditing ? (
            <Check size={16} strokeWidth={1.5} />
          ) : (
            <Pencil size={16} strokeWidth={1.5} />
          )}
        </IconButton>
      )}
    </Box>
  );
};
