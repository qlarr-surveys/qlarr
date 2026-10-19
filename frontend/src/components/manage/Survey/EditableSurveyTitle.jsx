import { Box, IconButton, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import styles from "./Survey.module.css";
import { Edit, Check } from "@mui/icons-material";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

export const EditableSurveyTitle = ({ survey, onSave, isEditable = true }) => {
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
      handleSave();
    }
  };

  const handleEditClick = (event) => {
    event.stopPropagation();
    setIsEditing(true);
  };

  return (
    <Box className={styles.titleContainer}>
      {isEditing ? (
        <>
          <TextField
            sx={{ px: 3, flexGrow: 1 }}
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            autoFocus
            variant="standard"
            fullWidth
            InputProps={{
              style: { color: "white" },
            }}
          />
          <IconButton
            className={styles.saveIcon}
            onClick={handleSave}
            sx={{ ml: 1 }}
          >
            <Check sx={{ color: "white" }} />
          </IconButton>
        </>
      ) : (
        <>
          {<Box gap={1} pl={1} display="flex" alignItems="center">
            <CustomTooltip body={t(`tooltips.survey_title`)} />
          </Box>}

          <Typography
            variant="h5"
            onClick={isEditable ? handleEditClick : undefined}
            sx={{
              pr: 3,
              pl: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: "2",
              WebkitBoxOrient: "vertical",
              flexGrow: 1,
              cursor: isEditable ? "pointer" : "default",
            }}
          >
            {title}
          </Typography>
          {isEditable && (
            <IconButton
              className={styles.nameIcon}
              onClick={handleEditClick}
              sx={{ ml: 1 }}
            >
              <Edit sx={{ color: "white" }} />
            </IconButton>
          )}
        </>
      )}
    </Box>
  );
};
