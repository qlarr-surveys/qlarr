import { Box, TextField } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import styles from "./Survey.module.css";
import { truncateWithEllipsis } from "~/utils/design/utils";
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

  // See EditableSurveyTitle: Escape blurs, and the blur would otherwise commit
  // the draft being thrown away.
  const discardRef = useRef(false);

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
    if (discardRef.current) {
      discardRef.current = false;
      setDescription(savedDescription);
      setIsDescriptionEditing(false);
      return;
    }
    if (description !== savedDescription) {
      onSave(description, () => setDescription(savedDescription));
    }
    setIsDescriptionEditing(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      // Enter commits, as it does for the name, so the line break it would
      // otherwise leave behind is prevented.
      event.preventDefault();
      handleSave();
    } else if (event.key === "Escape") {
      // See EditableSurveyTitle: the reset is what the reading state shows,
      // the flag is what stops a late blur from committing the draft.
      discardRef.current = true;
      setDescription(savedDescription);
      setIsDescriptionEditing(false);
    }
  };

  const handleEditClick = () => {
    setIsDescriptionEditing(true);
  };

  const shown = truncateWithEllipsis(description, charLimit);
  const placeholder = isEditable ? t("survey.description_placeholder") : "";

  /* The description itself is the control, as the redesign draws it: no pencil
     on hover, no save button after. The empty state is the same button holding
     the prompt to write one, which is what makes a blank description
     clickable at all. */
  const text = isEditable ? (
    <button
      type="button"
      dir="auto"
      className={`${styles.descriptionText} ${
        description ? "" : styles.descriptionEmpty
      }`}
      aria-label={t("edit_survey.edit_description")}
      onClick={handleEditClick}
    >
      {shown || placeholder}
    </button>
  ) : (
    <span dir="auto" className={styles.descriptionText}>
      {shown}
    </span>
  );

  return (
    <Box className={styles.descriptionContainer}>
      {/* The ⓘ stays mounted in both states. Swapping the whole row for the
          textarea was what made the card jump while you typed, and made the ⓘ
          vanish exactly when the hint was wanted. */}
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
          inputProps={{
            dir: "auto",
            "aria-label": t("label.survey_description"),
          }}
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
    </Box>
  );
};
