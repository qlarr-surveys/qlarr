import React, { Suspense, forwardRef } from "react";
import { useSelector } from "react-redux";

import { Box, css, useTheme } from "@mui/material";
import styles from "./Question.module.css";
import { stripTags, appendRequiredAsterisk } from "~/utils/design/utils";
import LoadingDots from "../common/LoadingDots";
import Validation from "../run/Validation";
import MultipleText from "../Questions/MultipleText/MultipleText";
import AutoCompleteQuestion from "../Questions/AutoComplete/AutoCompleteQuestion";
import { replaceFormatInstructions } from "../run/Content";

const DateTimeQuestion = React.lazy(
  () => import("../Questions/DateTime/DateTimeQuestion"),
);
const SCQ = React.lazy(() => import("../Questions/Scq/Scq"));
const Array = React.lazy(() => import("../Questions/SCQArray/Array"));
const Signature = React.lazy(() => import("../Questions/Signature/Signature"));
const PhotoCapture = React.lazy(
  () => import("../Questions/PhotoCapture/PhotoCapture"),
);
const VideoCapture = React.lazy(
  () => import("../Questions/VideoCapture/VideoCapture"),
);
const MCQ = React.lazy(() => import("../Questions/Mcq/Mcq"));
const NumberQuestion = React.lazy(
  () => import("../Questions/Number/NumberQuestion"),
);
const TextQuestion = React.lazy(() => import("../Questions/Text/TextQuestion"));
const VideoDisplay = React.lazy(
  () => import("../Questions/VideoDisplay/VideoDisplay"),
);
const ImageDisplay = React.lazy(
  () => import("../Questions/ImageDisplay/ImageDisplay"),
);
const ImageRanking = React.lazy(
  () => import("../Questions/ImageRanking/ImageRanking"),
);
const ParagraphQuestion = React.lazy(
  () => import("../Questions/Paragraph/ParagraphQuestion"),
);
const Barcode = React.lazy(() => import("../Questions/Barcode/Barcode"));
const EmailQuestion = React.lazy(
  () => import("../Questions/Email/EmailQuestion"),
);
const ImageScq = React.lazy(() => import("../Questions/ImageScq/ImageScq"));
const ImageMcq = React.lazy(() => import("../Questions/ImageMcq/ImageMcq"));
const Ranking = React.lazy(() => import("../Questions/Ranking/Ranking"));
const NPS = React.lazy(() => import("../Questions/NPS/NPS"));
const Content = React.lazy(() => import("../run/Content"));
const FileUpload = React.lazy(
  () => import("../Questions/FileUpload/FileUpload"),
);
const IconScq = React.lazy(() => import("../Questions/IconScq/IconScq"));
const IconMcq = React.lazy(() => import("../Questions/IconMcq/IconMcq"));
const SCQIconArray = React.lazy(
  () => import("../Questions/SCQArray/SCQIconArray"),
);

const Question = forwardRef((props, ref) => {
  console.debug("rendering: " + props.component.code);
  const relevance = useSelector((state) => {
    let questionState = state.runState.values[props.component.qualifiedCode];
    return (
      typeof questionState?.relevance === "undefined" ||
      questionState?.relevance
    );
  });

  const theme = useTheme();
  const showDescription =
    props.component.showDescription &&
    props.component.content?.description &&
    stripTags(props.component.content.description).length > 0;
  const showTitle =
    props.component.content?.label &&
    stripTags(props.component.content?.label).length > 0;
  const showHeader = showTitle || showDescription;

  const showQuestion = () => {
    switch (props.component.type) {
      case "date_time":
        return (
          <DateTimeQuestion
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "date":
        return (
          <DateTimeQuestion
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "time":
        return (
          <DateTimeQuestion
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "scq":
        return (
          <SCQ
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "multiple_text":
        return (
          <MultipleText
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "mcq_array":
      case "scq_array":
        return (
          <Array
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "scq_icon_array":
        return (
          <SCQIconArray
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "file_upload":
        return (
          <FileUpload
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "signature":
        return (
          <Signature
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "photo_capture":
        return (
          <PhotoCapture
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "video_capture":
        return (
          <VideoCapture
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "mcq":
        return (
          <MCQ
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "number":
        return (
          <NumberQuestion
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "text":
        return (
          <TextQuestion
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "video_display":
        return (
          <VideoDisplay
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "image_display":
        return (
          <ImageDisplay
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "image_ranking":
        return (
          <ImageRanking
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "autocomplete":
        return (
          <AutoCompleteQuestion
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "paragraph":
        return (
          <ParagraphQuestion
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "barcode":
        return (
          <Barcode
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "email":
        return (
          <EmailQuestion
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "image_scq":
        return (
          <ImageScq
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "icon_scq":
        return (
          <IconScq
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "icon_mcq":
        return (
          <IconMcq
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "image_mcq":
        return (
          <ImageMcq
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "ranking":
        return (
          <Ranking
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      case "nps":
        return (
          <NPS
            key={props.component.qualifiedCode}
            component={props.component}
          />
        );
      default:
        return "";
    }
  };

  return relevance ? (
    <QuestionWrapper
      customCss={props.component.customCss}
      qualifiedCode={props.component.qualifiedCode}
      ref={ref}
    >
      {showHeader && (
        <>
          {showTitle && (
            <Content
              className={`${styles.content} ${styles.question}`}
              name="label"
              customStyle={`
        font-size: ${theme.textStyles.question.size}px;
        `}
              elementCode={props.component.qualifiedCode}
              content={
                props.component.validation?.validation_required?.isActive
                || props.component.validation?.validation_min_option_count?.isActive
                || props.component.validation?.validation_min_ranking_count?.isActive
                  ? appendRequiredAsterisk(
                      props.component.content?.label,
                      theme.palette.error.main,
                    )
                  : props.component.content?.label
              }
            />
          )}
          {showDescription && (
            <Box className={styles.textDescription}>
              <Content
                elementCode={props.component.code}
                name="description"
                customStyle={`
        font-size: ${theme.textStyles.text.size}px;
        `}
                content={props.component.content.description}
              />
            </Box>
          )}
        </>
      )}

      <Suspense fallback={<LoadingDots />}>{showQuestion()}</Suspense>
      <Suspense fallback={<LoadingDots />}>
        <QuestionValidation component={props.component} />
      </Suspense>
    </QuestionWrapper>
  ) : (
    ""
  );
});

export default React.memo(Question);

export const QuestionValidation = React.memo(({ component }) => {
  const showValidation = useSelector((state) => {
    let questionState = state.runState.values[component.qualifiedCode];
    let show_errors = state.runState.values.Survey.show_errors;
    let isDirty = state.templateState[component.qualifiedCode];
    let validity = questionState?.validity;
    return (show_errors || isDirty) && validity === false;
  });
  return !showValidation ? <></> : <Validation component={component} />;
});

const QuestionWrapper = React.memo((props) => {
  const invalid = useSelector((state) => {
    let questionState = state.runState.values[props.qualifiedCode];
    let show_errors = state.runState.values.Survey.show_errors;
    let isDirty = state.templateState[props.qualifiedCode];
    let validity = questionState?.validity;
    return (show_errors || isDirty) && validity === false;
  });
  const formatState = useSelector((state) => {
    return state.runState.values[props.qualifiedCode];
  });

  return (
    <Box
      data-code={props.qualifiedCode}
      css={css`
        ${replaceFormatInstructions(props.customCss, formatState, "custom_css")}
      `}
      sx={{
        borderColor: invalid ? "error.main" : "grey.500",
      }}
      className={`${styles.groupQuestion} ${invalid ? "invalidQuestion" : ""}`}
    >
      {props.children}
    </Box>
  );
});
