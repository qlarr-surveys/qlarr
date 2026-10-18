import { Box, TextField } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import styles from "./Survey.module.css";
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

  // Escape leaves the field, and leaving it blurs, which would otherwise save
  // the draft being discarded. A ref, not state: that blur arrives before a
  // state update from the same keystroke could be read back.
  const discardRef = useRef(false);

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
    if (discardRef.current) {
      discardRef.current = false;
      setTitle(survey.name);
      setIsEditing(false);
      return;
    }
    if (title.trim() === "") {
      setTitle(survey.name);
    } else if (title !== survey.name) {
      onSave(title, () => setTitle(survey.name));
    }
    setIsEditing(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      // The field is two rows, so without this Enter would insert a line break
      // into the name on its way to saving.
      event.preventDefault();
      handleSave();
    } else if (event.key === "Escape") {
      // Both, and neither is redundant: the reset is what the reading state
      // shows, because closing the editor unmounts the field without
      // necessarily blurring it, and the flag is what stops a blur that does
      // arrive from committing the draft it still has in its closure.
      discardRef.current = true;
      setTitle(survey.name);
      setIsEditing(false);
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
        /* Two rows, like the reading state's two clamped lines, so a long name
           does not change the row's height when the editor opens. */
        <TextField
          className={styles.titleField}
          value={title}
          onChange={handleTitleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          autoFocus
          variant="standard"
          InputProps={{ disableUnderline: true }}
          inputProps={{ dir: "auto", "aria-label": t("label.survey_name") }}
          fullWidth
          multiline
          rows={2}
        />
      ) : isEditable ? (
        /* The name itself is the control, as the redesign draws it: no pencil
           to reveal on hover, and nothing to aim at afterwards. A button, not
           a click handler on the text, so it can be reached and is announced
           as something that does something. dir="auto" because a survey named
           in Arabic should read right-to-left inside an English page. */
        <button
          type="button"
          dir="auto"
          className={styles.titleText}
          title={title}
          aria-label={t("edit_survey.edit_name", { name: title })}
          onClick={handleEditClick}
        >
          {title}
        </button>
      ) : (
        <span dir="auto" className={styles.titleText}>
          {title}
        </span>
      )}

      {/* Holds the badge at the end of the row whatever the name's length --
          but only while reading. The open field claims the row's free space,
          and a spacer that still grew would take half of it. */}
      {!isEditing && <span className={styles.rowSpacer} />}
      {badge}
    </Box>
  );
};
