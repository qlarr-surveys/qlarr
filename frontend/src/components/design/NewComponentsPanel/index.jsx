import React from "react";
import styles from "./NewComponentsPanel.module.css";
import NewComponentsItem from "~/components/design/NewComponentsItem";
import { QUESTION_TYPES } from "~/components/Questions/utils";
import { FormatListBulleted } from "@mui/icons-material";
import { Lightbulb } from "lucide-react";
import { useDispatch } from "react-redux";
import { addComponent } from "~/state/design/designState";

// Pages are not a question type, so they are not in QUESTION_TYPES; they get
// their own group at the top of the list, shaped the same way.
const groups = [
  {
    name: "section_sections",
    type: "sections",
    items: [
      {
        idType: 2,
        type: "group",
        // fontSize inherit, and no colour of its own: the icon chip around it
        // sets both, so this glyph matches the SurveyIcon ones beside it.
        icon: <FormatListBulleted fontSize="inherit" />,
      },
    ],
  },
];

// Survives a reload so the tip does not reappear for someone who has read it.
const COACH_KEY = "qlarr.questionTypesCoachDismissed";

const readDismissed = () => {
  try {
    return localStorage.getItem(COACH_KEY) === "true";
  } catch {
    // Private windows and blocked site data throw on access; the tip showing
    // again is a smaller problem than the panel failing to render.
    return false;
  }
};

function NewComponentsPanel({ t }) {
  const dispatch = useDispatch();
  const [coachDismissed, setCoachDismissed] = React.useState(readDismissed);

  const dismissCoach = () => {
    setCoachDismissed(true);
    try {
      localStorage.setItem(COACH_KEY, "true");
    } catch {
      // Dismissed for this session either way.
    }
  };

  const handleAddComponent = (type, questionType) => {
    dispatch(addComponent({ type, questionType }));
  };

  return (
    <div className={styles.leftContent}>
      {!coachDismissed && (
        <div role="note" className={styles.coach}>
          <Lightbulb
            size={16}
            strokeWidth={1.5}
            aria-hidden="true"
            className={styles.coachIcon}
          />
          <p className={styles.coachBody}>
            <strong className={styles.coachTitle}>{t("types_coach_title")}</strong>{" "}
            {t("types_coach_body")}
          </p>
          <button type="button" onClick={dismissCoach} className={styles.coachDismiss}>
            {t("types_coach_dismiss")}
          </button>
        </div>
      )}

      {groups.map((item) => (
        <div data-tour="add-page" className={styles.group} key={item.name}>
          <h3 className={styles.groupTitle}>{t(item.name)}</h3>
          {item.items.map((question) => (
            <NewComponentsItem
              key={question.type}
              t={t}
              item={{
                type: "groups",
                itemType: question.type,
                droppableId: "new-groups",
                draggableId: question.type,
                icon: question.icon,
              }}
              onClick={() => handleAddComponent("group", question.type)}
            />
          ))}
        </div>
      ))}

      <div data-tour="question-types-list">
        {QUESTION_TYPES.map((item) => (
          <div data-tour="question-types" className={styles.group} key={item.name}>
            <h3 className={styles.groupTitle}>{t(item.name)}</h3>
            {item.items.map((question) => (
              <NewComponentsItem
                key={question.type}
                t={t}
                item={{
                  type: "new-questions",
                  itemType: question.type,
                  offlineOnly: question.offlineOnly || false,
                  droppableId: "new-questions",
                  draggableId: question.type,
                  icon: question.icon,
                }}
                onClick={() => handleAddComponent("question", question.type)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default React.memo(NewComponentsPanel);

export { createGroup } from "@qlarr/design-core/factory/groupFactory";
