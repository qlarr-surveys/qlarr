import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { isSurveyAdmin } from "~/constants/roles";
import { surveyAttributeChangedImmediate } from "~/state/edit/editState";
import styles from "./SurveyHeader.module.css";

// The ceiling the dashboard card's rename already enforces; the name is shown
// in both places, so they cannot disagree about what fits.
const MAX_LENGTH = 50;

/**
 * The survey's name in the editor header, renamed in place.
 *
 * The rename goes through the settings slice rather than its own request, so
 * it is saved by the same debounced saver as every other survey attribute:
 * the header's own save state covers it, and a failed save refetches the
 * survey, which puts the old name back without this component tracking it.
 */
function SurveyTitle() {
  const dispatch = useDispatch();
  const { t } = useTranslation(NAMESPACES.MANAGE);

  const name = useSelector((state) => state.editState.survey?.name || "");
  const canRename = isSurveyAdmin();

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  // Escape leaves the field, and leaving it blurs, which would otherwise save
  // the draft being discarded. A ref, not state: that blur arrives before a
  // state update from the same keystroke could be read back.
  const discardRef = useRef(false);

  // Follow the name when it changes underneath us — a rename from the
  // dashboard card, or the survey arriving after this first renders.
  // isEditing is read but deliberately not a dependency: resetting as editing
  // ends would flash the previous name while the save is still in flight.
  useEffect(() => {
    if (!isEditing) {
      setDraft(name);
    }
  }, [name]);

  const commit = () => {
    setIsEditing(false);

    if (discardRef.current) {
      discardRef.current = false;
      setDraft(name);
      return;
    }

    const next = draft.trim();
    // A survey with no name is not a rename anyone meant; so is one that only
    // gained whitespace. Both go back to what is stored.
    if (!next || next === name) {
      setDraft(name);
      return;
    }

    dispatch(surveyAttributeChangedImmediate({ key: "name", value: next }));
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      discardRef.current = true;
      event.currentTarget.blur();
    }
  };

  // The survey is still loading: an empty box where the name goes reads as a
  // broken control, and there is nothing to rename yet either.
  if (!name) {
    return null;
  }

  if (!canRename) {
    return <span className={styles.titleStatic}>{name}</span>;
  }

  if (isEditing) {
    return (
      // data-value is what the field measures itself against — see the grid in
      // the stylesheet.
      <span className={styles.titleField} data-value={draft}>
        <input
          autoFocus
          type="text"
          value={draft}
          maxLength={MAX_LENGTH}
          aria-label={t("survey_header.name_label")}
          className={styles.titleInput}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
        />
      </span>
    );
  }

  return (
    <CustomTooltip showIcon={false} title={t("survey_header.rename")}>
      <button
        type="button"
        className={styles.title}
        onClick={() => setIsEditing(true)}
      >
        {name}
      </button>
    </CustomTooltip>
  );
}

export default React.memo(SurveyTitle);
