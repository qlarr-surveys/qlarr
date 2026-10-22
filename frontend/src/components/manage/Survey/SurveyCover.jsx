import { useRef } from "react";
import { Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { buildResourceUrl } from "~/networking/common";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { STATUS } from "./status";
import { fLocal } from "./dates";
import styles from "./Survey.module.css";

// The watermarked placeholder production uses on a survey with no logo of
// its own. Tiled with a faint "Qlarr", it says the cover is not the survey's
// yet in the image as well as in the prompt over it -- which is what lets the
// card carry the same 30% scrim as every other card rather than a heavier
// wash to mark itself out.
const DEFAULT_LOGO = "/placehoder-logo.png";

/**
 * The card's cover: the survey logo, the status pill, and — for an admin — a
 * way to replace the logo by clicking or by keyboard.
 *
 * The replace affordance is a real `<button>` over a hidden input rather than
 * the old `<Box onClick>` that called `getElementById(...).click()`: that was
 * unreachable by keyboard. CSS reveals it on `:hover` and `:focus-within` —
 * and keeps it up with no hover at all on a survey still wearing the
 * placeholder, so the one card that has something to fix is the one card that
 * says so.
 */
export function SurveyCover({ survey, surveyStatus, isEditable, onUpload }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const inputRef = useRef(null);

  const hasLogo = Boolean(survey.image);
  const logoUrl = hasLogo
    ? buildResourceUrl(survey.image, survey.id)
    : DEFAULT_LOGO;
  // "Add" reuses the existing key; only "Replace" is new copy.
  const uploadLabel = t(
    hasLogo ? "edit_survey.replace_logo" : "edit_survey.add_logo"
  );

  return (
    <div
      className={styles.cover}
      data-needs-logo={!hasLogo && isEditable ? "true" : undefined}
    >
      {/* Decorative: the survey name is right below it. */}
      <div
        aria-hidden="true"
        className={styles.coverLogo}
        style={{ backgroundImage: `url("${logoUrl}")` }}
      />

      {isEditable && (
        <>
          <button
            type="button"
            className={styles.coverReplace}
            onClick={() => inputRef.current?.click()}
            aria-label={uploadLabel}
          >
            <span aria-hidden="true" className={styles.coverReplaceIcon}>
              <Upload size={16} strokeWidth={1.5} />
            </span>
            <span aria-hidden="true" className={styles.coverReplaceLabel}>
              {uploadLabel}
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className={styles.coverInput}
            onChange={(event) => {
              const file = event.target.files[0];
              // Clear it so picking the same file again still fires onChange.
              event.target.value = "";
              if (file) {
                onUpload(file);
              }
            }}
          />
        </>
      )}

      {/* The legend carries its own heading, so no `title`: CustomTooltip's
          would be a second one above it. It is also a bigger card than the
          one-line tooltips the defaults are cut for — the redesign gives the
          status legend 320px and its own padding, radius and shadow. */}
      <CustomTooltip
        showIcon={false}
        placement="top-end"
        tooltipSx={{
          width: 320,
          maxWidth: 320,
          padding: "12px 14px",
          borderRadius: "10px",
          boxShadow: "0 12px 28px rgba(20, 24, 52, 0.28)",
        }}
        body={<StatusLegend t={t} survey={survey} surveyStatus={surveyStatus} />}
      >
        <div className={`${styles.statusPill} ${styles[surveyStatus]}`}>
          <span className={styles.statusDot} />
          {t(`status.${surveyStatus}`)}
        </div>
      </CustomTooltip>
    </div>
  );
}

// Lifecycle order, as the legend has always listed them: a survey moves down
// this list, so reading it top to bottom is reading the life of a survey.
const LEGEND_ORDER = [
  STATUS.DRAFT,
  STATUS.SCHEDULED,
  STATUS.ACTIVE,
  STATUS.EXPIRED,
  STATUS.CLOSED,
];

/**
 * What every status means, with this survey's own marked, plus its dates when
 * it has them.
 *
 * All five, because the pill colours are a key and a key is no use one entry
 * at a time: the question a pill raises is as often "what are the others?" as
 * "what is this one?". The row the card is actually on is marked — lifted,
 * and named "· this survey" — so that the second question is still answered
 * by a glance rather than a read.
 *
 * The card's stat slot shows whichever single date the status is waiting on,
 * so the line under the legend is where both dates are read together -- and
 * the only place the other one is read at all.
 */
function StatusLegend({ t, survey, surveyStatus }) {
  const dates = [];

  // Whatever dates the survey carries, whatever its status. The card's own
  // slot picks one by status; this line is the full record, so gating it the
  // same way would leave the other date nowhere to be read.
  if (survey.startDate) {
    dates.push(
      `${t("edit_survey.metadata.start_date")}: ${fLocal(survey.startDate)}`
    );
  }
  if (survey.endDate) {
    dates.push(
      `${t("edit_survey.metadata.end_date")}: ${fLocal(survey.endDate)}`
    );
  }

  return (
    <>
      {/* Uppercased by CSS, not by the string: a locale that does not
          uppercase, or whose script has no case at all, keeps its own. */}
      <p className={styles.legendTitle}>{t("status_legend.title")}</p>

      <dl className={styles.legend}>
        {LEGEND_ORDER.map((status) => {
          const current = status === surveyStatus;
          return (
            <div
              key={status}
              className={styles.legendRow}
              data-current={current ? "true" : undefined}
            >
              <span
                aria-hidden="true"
                className={`${styles.legendDot} ${styles[status]}`}
              />
              <div>
                <dt className={styles.legendName}>
                  {t(`status.${status}`)}
                  {current && (
                    <span className={styles.legendHere}>
                      {` · ${t("status_legend.this_survey")}`}
                    </span>
                  )}
                </dt>
                <dd className={styles.legendMeaning}>
                  {t(`status_info.${status}`)}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>

      {dates.length > 0 && (
        <p className={styles.legendDates}>{dates.join(" · ")}</p>
      )}
    </>
  );
}
