import React from "react";
import { RotateCcw } from "lucide-react";
import ConfirmActionModal from "~/components/common/ConfirmActionModal";
import { useBoolean } from "~/hooks/use-boolean";
import BackgroundField from "./BackgroundField";
import ChoiceField from "./ChoiceField";
import ColorField from "./ColorField";
import ThemeSection from "./ThemeSection";
import useSurveyTheme from "./useSurveyTheme";
import { contrastRatio } from "./colors";
import styles from "./ThemePanel.module.css";
import {
  ACCENT_COLORS,
  ANSWER_SIZES,
  AREA_BACKGROUNDS,
  FONTS,
  MORE_ANSWER_SIZES,
  MORE_FONTS,
  MORE_QUESTION_SIZES,
  MORE_TITLE_SIZES,
  QUESTION_SIZES,
  SURVEY_BACKGROUNDS,
  TEXT_COLORS,
  TITLE_SIZES,
} from "./constants";

const px = (size) => `${size}px`;

// The Colors group summarises itself with how many colours it holds.
const COLOR_COUNT = "4";

/**
 * The Theme workspace's left panel: typography, colours and the survey
 * background, grouped so one concern is open at a time.
 *
 * Every control writes straight to the survey theme — there is no draft and no
 * save button, because the survey rendered beside the panel is the preview.
 */
function ThemePanel({ t }) {
  const [openSection, setOpenSection] = React.useState("colors");
  const confirmReset = useBoolean();
  const {
    values,
    setFont,
    setSize,
    setTextColor,
    setColor,
    setBackgroundImage,
    reset,
  } = useSurveyTheme();

  const toggle = (id) => setOpenSection((open) => (open === id ? null : id));

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.headTitle}>{t("survey_theme")}</h2>
        <p className={styles.headHint}>{t("theme_panel_hint")}</p>
      </div>

      <div className={styles.sections}>
        <ThemeSection
          id="typography"
          title={t("theme_section_typography")}
          meta={values.font}
          open={openSection === "typography"}
          onToggle={() => toggle("typography")}
        >
          <ChoiceField
            label={t("theme_survey_font")}
            current={values.font}
            value={values.font}
            options={FONTS}
            moreOptions={MORE_FONTS}
            moreLabel={t("theme_more_fonts")}
            onChange={setFont}
          />
          <ChoiceField
            label={t("theme_page_title_size")}
            current={px(values.titleSize)}
            value={values.titleSize}
            options={TITLE_SIZES}
            moreOptions={MORE_TITLE_SIZES}
            moreLabel={t("theme_more_sizes")}
            unit="px"
            onChange={(size) => setSize("group", size)}
          />
          <ChoiceField
            label={t("theme_question_text_size")}
            current={px(values.questionSize)}
            value={values.questionSize}
            options={QUESTION_SIZES}
            moreOptions={MORE_QUESTION_SIZES}
            moreLabel={t("theme_more_sizes")}
            unit="px"
            onChange={(size) => setSize("question", size)}
          />
          <ChoiceField
            label={t("theme_answer_text_size")}
            current={px(values.answerSize)}
            value={values.answerSize}
            options={ANSWER_SIZES}
            moreOptions={MORE_ANSWER_SIZES}
            moreLabel={t("theme_more_sizes")}
            unit="px"
            onChange={(size) => setSize("text", size)}
          />
        </ThemeSection>

        <ThemeSection
          id="colors"
          title={t("theme_section_colors")}
          meta={COLOR_COUNT}
          open={openSection === "colors"}
          onToggle={() => toggle("colors")}
        >
          <ColorField
            t={t}
            name="accent"
            label={t("theme_accent_color")}
            value={values.accent}
            presets={ACCENT_COLORS}
            onChange={(value) => setColor("primaryColor", value)}
          />
          <ColorField
            t={t}
            name="surveyBg"
            label={t("theme_survey_background")}
            value={values.surveyBg}
            presets={SURVEY_BACKGROUNDS}
            onChange={(value) => setColor("bgColor", value)}
          />
          <ColorField
            t={t}
            name="areaBg"
            label={t("theme_question_area_background")}
            value={values.areaBg}
            presets={AREA_BACKGROUNDS}
            onChange={(value) => setColor("paperColor", value)}
          />
          <ColorField
            t={t}
            name="textColor"
            label={t("theme_survey_text_color")}
            value={values.textColor}
            presets={TEXT_COLORS}
            onChange={setTextColor}
          />
          <ContrastNote t={t} text={values.textColor} background={values.areaBg} />
        </ThemeSection>

        <ThemeSection
          id="background"
          title={t("theme_section_background")}
          meta={
            values.backgroundImage
              ? t("theme_background_type_image")
              : t("theme_background_type_color")
          }
          open={openSection === "background"}
          onToggle={() => toggle("background")}
        >
          <BackgroundField
            t={t}
            values={values}
            onColorChange={(value) => setColor("bgColor", value)}
            onImageChange={setBackgroundImage}
          />
        </ThemeSection>
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          onClick={confirmReset.onTrue}
          className={styles.resetButton}
        >
          <RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />
          {t("reset_theme")}
        </button>
      </div>

      <ConfirmActionModal
        open={confirmReset.value}
        title={t("reset_theme_title")}
        description={t("reset_theme_description")}
        cancelLabel={t("cancel")}
        confirmLabel={t("reset_action")}
        confirmColor="warning"
        onClose={confirmReset.onFalse}
        onConfirm={() => {
          reset();
          confirmReset.onFalse();
        }}
      />
    </div>
  );
}

/**
 * How the survey text reads on the question area behind it. Colour pickers let
 * anyone build an unreadable survey; this says so while the choice is being
 * made, in the same terms WCAG does.
 */
const ContrastNote = React.memo(({ t, text, background }) => {
  const ratio = contrastRatio(text, background);
  if (ratio === null) {
    return null;
  }

  const level = ratio >= 7 ? "aaa" : ratio >= 4.5 ? "aa" : "fail";
  const tone = level === "fail" ? styles.noteBad : styles.noteGood;

  return (
    <p className={`${styles.note} ${tone}`}>
      {t(`theme_contrast_${level}`, { ratio: ratio.toFixed(1) })}
    </p>
  );
});

export default React.memo(ThemePanel);
