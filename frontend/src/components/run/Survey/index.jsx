import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useTheme } from "@mui/material";
import { FORM_ID } from "~/constants/run";
import Group from "~/components/Group";
import Navigation from "~/components/run/Navigation";
import styles from "./Survey.module.css";
import { shallowEqual, useSelector } from "react-redux";
import { TouchBackend } from "react-dnd-touch-backend";
import { isTouchDevice } from "~/utils/isTouchDevice";
import { buildResourceUrl } from "~/networking/common";
import {
  LOGO_ALIGNMENT_DEFAULT,
  LOGO_SIZE_DEFAULT,
  LOGO_SIZE_DIMENSIONS,
  LOGO_SPACING_DEFAULT,
} from "~/constants/design";

const ALIGNMENT_TO_FLEX = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

function Survey() {
  const theme = useTheme();

  const navigationIndex = useSelector((state) => {
    return state.runState.data?.navigationIndex;
  }, shallowEqual);
  const survey = useSelector((state) => {
    return state.runState.data?.survey;
  }, shallowEqual);
  const logoImage = useSelector((state) => {
    return state.runState.data?.survey?.resources?.logoImage;
  });
  const logoAlignment = useSelector(
    (state) =>
      state.runState.data?.survey?.resources?.logoAlignment ||
      LOGO_ALIGNMENT_DEFAULT
  );
  const logoSize = useSelector(
    (state) =>
      state.runState.data?.survey?.resources?.logoSize || LOGO_SIZE_DEFAULT
  );
  const logoSpacing = useSelector((state) => {
    const val = state.runState.data?.survey?.resources?.logoSpacing;
    return typeof val === "number" ? val : LOGO_SPACING_DEFAULT;
  });

  const logoSizePx =
    LOGO_SIZE_DIMENSIONS[logoSize] || LOGO_SIZE_DIMENSIONS.medium;

  return (
    <DndProvider backend={isTouchDevice() ? TouchBackend : HTML5Backend}>
      <form
        id={FORM_ID}
        onSubmit={(e) => e.preventDefault()}
        style={{
          paddingTop: "2rem",
          marginRight: "6px",
          marginLeft: "6px"
        }}
      >
        {logoImage && (
          <div
            className={styles.surveyLogoWrapper}
            style={{
              justifyContent: ALIGNMENT_TO_FLEX[logoAlignment] || "center",
              marginTop: `${logoSpacing / 2}px`,
              marginBottom: `calc(2rem + ${logoSpacing / 2}px)`,
            }}
          >
            <img
              className={styles.surveyLogo}
              src={buildResourceUrl(logoImage)}
              alt=""
              style={{
                height: `${logoSizePx}px`,
                width: "auto",
                maxWidth: "100%",
              }}
            />
          </div>
        )}
        <div className={styles.surveyGroups}>
          {survey && survey.groups
            ? survey.groups
                .filter((group) => group.inCurrentNavigation)
                .map((group, index) => (

                    <Group group={group} groupIndex={index} />

                ))
            : ""}
          <Navigation navigationIndex={navigationIndex} />
        </div>
      </form>
    </DndProvider>
  );
}

export default Survey;
