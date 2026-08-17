import React from "react";

import styles from "./SurveyIndex.module.css";
import { stripTags } from "~/utils/design/utils";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { jump } from "~/state/runState";
import { questionIconByType } from "~/components/Questions/utils";
import { useTheme } from "@emotion/react";
import ErrorOutlineOutlined from "@mui/icons-material/ErrorOutlineOutlined";
import useMediaQuery from "@mui/material/useMediaQuery";
import { getClosestScrollableParent } from "~/components/run/Navigation";

function SurveyIndex(props) {
  const dispatch = useDispatch();
  const theme = useTheme();
  // Drawer overlaps content on small viewports (including phone preview, where
  // the iframe is 375px wide), so dismiss it after a jump there. On desktop
  // the drawer sits beside the survey, so keep it open for rapid navigation.
  const isMobileViewport = useMediaQuery("(max-width: 600px)");

  const relevance_map = useSelector((state) => {
    return state.runState.values["Survey"].relevance_map;
  }, shallowEqual);

  const validity_map = useSelector((state) => {
    return state.runState.values["Survey"].validity_map;
  }, shallowEqual);


  const canJump = useSelector((state) => {
    return state.runState.data.navigationData.allowJump;
  }, shallowEqual);

  const isCurrentGroup = (groupCode) => {
    return (
      props.navigationIndex.name == "group" &&
      groupCode == props.navigationIndex.groupId
    );
  };

  const isCurrentQuestion = (questionCode) => {
    return (
      props.navigationIndex.name == "question" &&
      questionCode == props.navigationIndex.questionId
    );
  };

  const isGroupClickable = (groupCode) =>
    canJump && !isCurrentGroup(groupCode);

  const isQuestionClickable = (questionCode) =>
    canJump && !isCurrentQuestion(questionCode);

  const closeDrawer = () => {
    if (!isMobileViewport) return;
    if (props.onCloseDrawer) props.onCloseDrawer();
  };

  const scrollToElement = (el) => {
    if (!el) return;
    const container = getClosestScrollableParent(el);
    // No scrollable ancestor → content already fits the viewport, so the
    // element is visible without scrolling. Skip rather than call
    // el.scrollIntoView, which propagates to the parent window when this runs
    // inside the preview iframe and pushes the preview-mode-tabs off-screen.
    if (!container || container === document.documentElement) return;
    container.scrollTo({
      top: el.offsetTop - container.offsetTop,
      behavior: "smooth",
    });
  };

  const onGroupClicked = (groupCode) => {
    if (!isGroupClickable(groupCode)) return;
    closeDrawer();
    const el = document.querySelector(`[data-code="${groupCode}"]`);
    if (el) {
      scrollToElement(el);
      return;
    }
    if (props.onPendingScrollTarget) {
      props.onPendingScrollTarget(groupCode);
    }
    if (props.navigationIndex.name === "question") {
      const group = props.survey?.groups?.find((g) => g.code === groupCode);
      const firstQuestion = group?.questions?.find(
        (q) => relevance_map[q.code],
      );
      if (firstQuestion) {
        dispatch(
          jump({ ...props.navigationIndex, questionId: firstQuestion.code }),
        );
        return;
      }
    }
    dispatch(jump({ ...props.navigationIndex, groupId: groupCode }));
  };

  const onQuestionClicked = (questionCode, groupCode) => {
    if (!isQuestionClickable(questionCode)) return;
    closeDrawer();
    const el = document.querySelector(`[data-code="${questionCode}"]`);
    if (el) {
      scrollToElement(el);
      return;
    }
    if (props.onPendingScrollTarget) {
      props.onPendingScrollTarget(questionCode);
    }
    if (props.navigationIndex.name === "group") {
      dispatch(jump({ ...props.navigationIndex, groupId: groupCode }));
    } else {
      dispatch(jump({ ...props.navigationIndex, questionId: questionCode }));
    }
  };

  const questionState = (questionCode) => {
    if (isCurrentQuestion(questionCode)) return "current";
    if (validity_map[questionCode] === false) return "invalid";
    return "pending";
  };

  const renderStatusIcon = (state) => {
    if (state === "invalid") {
      return (
        <ErrorOutlineOutlined
          className={styles.statusIcon}
          fontSize="inherit"
          data-status="invalid"
        />
      );
    }
    return null;
  };

  const handleActivateKey = (e, fn) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };

  if (!props.survey?.groups) return null;

  const groups = props.survey.groups.filter(
    (group) => relevance_map[group.code] && group.groupType != "END",
  );

  return (
    <div className={styles.list}>
      {groups.map((group) => {
        const groupClickable = isGroupClickable(group.code);
        const groupCurrent = isCurrentGroup(group.code);
        const groupLabel = stripTags(group.content?.label) || "";
        return (
          <section key={group.code} className={styles.groupSection}>
            {groupLabel && (
              <div
                className={styles.groupHeader}
                data-clickable={groupClickable ? "true" : "false"}
                data-current={groupCurrent ? "true" : "false"}
                role={groupClickable ? "button" : undefined}
                tabIndex={groupClickable ? 0 : -1}
                aria-current={groupCurrent ? "step" : undefined}
                onClick={() => onGroupClicked(group.code)}
                onKeyDown={(e) =>
                  groupClickable &&
                  handleActivateKey(e, () => onGroupClicked(group.code))
                }
              >
                {groupLabel}
              </div>
            )}
            <ul className={styles.questionList}>
              {group.questions
                .filter((question) => relevance_map[question.code])
                .map((question) => {
                  const state = questionState(question.code);
                  const clickable = isQuestionClickable(question.code);
                  const isCurrent = state === "current";
                  const isInvalid = state === "invalid";
                  const rawLabel = stripTags(question.content?.label) || "";
                  const labelText = rawLabel.trim();
                  return (
                    <li
                      key={question.code}
                      className={styles.questionRow}
                      data-state={state}
                      data-clickable={clickable ? "true" : "false"}
                      role={clickable ? "button" : undefined}
                      tabIndex={clickable ? 0 : -1}
                      aria-current={isCurrent ? "step" : undefined}
                      aria-invalid={isInvalid ? true : undefined}
                      onClick={() =>
                        onQuestionClicked(question.code, group.code)
                      }
                      onKeyDown={(e) =>
                        clickable &&
                        handleActivateKey(e, () =>
                          onQuestionClicked(question.code, group.code),
                        )
                      }
                    >
                      <span className={styles.iconTile}>
                        {questionIconByType(question.type, "1em", theme.palette.text.primary)}
                      </span>
                      <span
                        className={styles.questionLabel}
                        data-empty={labelText ? "false" : "true"}
                      >
                        {labelText}
                      </span>
                      <span className={styles.statusSlot}>
                        {renderStatusIcon(state)}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export default SurveyIndex;
