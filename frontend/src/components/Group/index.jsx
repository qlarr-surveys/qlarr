import React from "react";
import { useSelector, shallowEqual } from "react-redux";

import Question from "~/components/Question";
import Content, { replaceFormatInstructions } from "~/components/run/Content";

import styles from "./Group.module.css";
import { alpha, Box, css, Divider, useTheme } from "@mui/material";

function Group(props) {
  const theme = useTheme();

  const state = useSelector((state) => {
    let groupState = state.runState.values[props.group.code];
    return {
      showGroup:
        typeof groupState?.relevance === "undefined" || groupState.relevance,
    };
  }, shallowEqual);

  const formatState = useSelector((state) => {
    return state.runState.values[props.group.code];
  });

  const visibleQuestionCodes = useSelector((state) => {
    return (props.group?.questions ?? [])
      .filter((quest) => {
        if (!quest.inCurrentNavigation) return false;
        const q = state.runState.values[quest.qualifiedCode];
        return typeof q?.relevance === "undefined" || !!q?.relevance;
      })
      .map((q) => q.qualifiedCode);
  }, shallowEqual);

  const showGroup = () => {
    return (
      <Box
        data-code={props.group.code}
        className={styles.topLevel}
        style={{
          '--qlarr-shadow-color': alpha(theme.textStyles.question.color, 0.15),
          '--qlarr-bg-color': theme.palette.background.paper,
        }}
        css={css`
          ${replaceFormatInstructions(props.group.customCss, formatState, "custom_css")}
        `}
      >
        <div className={styles.groupHeader}>
          <Content
            elementCode={props.group.code}
            name="label"
            customStyle={`
        font-size: ${theme.textStyles.group.size}px;
        `}
            content={props.group.content?.label}
          />

          {props.group.showDescription && props.group.content?.description && (
            <Box className={styles.textDescription}>
              <Content
                elementCode={props.group.code}
                name="description"
                customStyle={`
        font-size: ${theme.textStyles.text.size}px;
        `}
                content={props.group.content?.description}
              />
            </Box>
          )}
        </div>

        {props.group && props.group.questions
          ? (() => {
              const visibleQuestions = props.group.questions.filter(
                (quest) => quest.inCurrentNavigation,
              );
              return visibleQuestions.map((quest, idx) => (
                <React.Fragment key={quest.code}>
                  <Question component={quest} />
                  {visibleQuestionCodes.indexOf(quest.code) >= 0 && idx < visibleQuestionCodes.length - 1 && (
                    <Divider  />
                  )}
                </React.Fragment>
              ));
            })()
          : ""}
      </Box>
    );
  };
  return state.showGroup && (props.group ? showGroup() : <></>);
}

export default React.memo(Group);
