import { Box, IconButton, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import styles from "./Survey.module.css";
import { Check, Pencil } from "lucide-react";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

export const EditableSurveyTitle = ({
  survey,
  onSave,
  isEditable = true,
  // Rendered at the end of the row, beside the title. The unpublished-changes
  // marker belongs next to the name it applies to.
  badge,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(survey.name);
  const { t } = useTranslation(NAMESPACES.MANAGE);

  // Follow the name when it changes underneath us: a refetch can bring a value
  // renamed in another session, and the card stays mounted across sorts and
  // filters (the grid keys by survey.id), so a stale seed would never clear.
  // isEditing is read but deliberately not a dependency: resetting as editing
  // ends would flash the previous name while the save is still in flight.
  useEffect(() => {
    if (!isEditing) {
      setTitle(survey.name);
    }
  }, [survey.name]);

  const handleTitleChange = (event) => {
    const newTitle = event.target.value;
    if (newTitle.length <= 50) {
      setTitle(newTitle);
    }
  };

  const handleSave = () => {
    if (title.trim() === "") {
      setTitle(survey.name);
    } else if (title !== survey.name) {
      onSave(title, () => setTitle(survey.name));
    }
    setIsEditing(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      // The field is two rows now, so without this Enter would insert a line
      // break into the name on its way to saving.
      event.preventDefault();
      handleSave();
    }
  };

  const handleEditClick = (event) => {
    event.stopPropagation();
    setIsEditing(true);
  };

  return (
    <Box className={styles.titleContainer}>
      {/* Kept mounted across both branches so the row does not jump when
          editing starts. */}
      <Box className={styles.rowInfo}>
        <CustomTooltip body={t(`tooltips.survey_title`)} />
      </Box>

      {isEditing ? (
        <>
          {/* Two rows, like the reading state's two clamped lines, so a long
              name does not change the row's height when the editor opens. */}
          <TextField
            className={styles.titleField}
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            autoFocus
            variant="standard"
            InputProps={{ disableUnderline: true }}
            fullWidth
            multiline
            rows={2}
          />
          <IconButton className={styles.saveIcon} onClick={handleSave}>
            <Check size={16} strokeWidth={1.5} />
          </IconButton>
        </>
      ) : (
        <>
          <Typography
            variant="h5"
            onClick={isEditable ? handleEditClick : undefined}
            className={styles.titleText}
            sx={{ cursor: isEditable ? "pointer" : "default" }}
          >
            {title}
          </Typography>
          {badge}
          {isEditable && (
            <IconButton
              className={styles.nameIcon}
              aria-label={t("edit_survey.edit_name")}
              onClick={handleEditClick}
            >
              <Pencil size={16} strokeWidth={1.5} />
            </IconButton>
          )}
        </>
      )}
    </Box>
  );
};
