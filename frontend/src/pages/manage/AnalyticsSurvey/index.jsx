import React, { startTransition, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useService } from "~/hooks/use-service";
import LoadingDots from "~/components/common/LoadingDots";
import QuestionCard from "~/components/analytics/QuestionCard";
import LazyRender from "~/components/common/LazyRender";
import { getQuestionTypeLabel } from "~/components/analytics/questionTypes";
import useProgressiveList from "~/hooks/useProgressiveList";
import styles from "./AnalyticsSurvey.module.css";

function Notice({ title, children, error }) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={`${styles.notice} ${error ? styles.noticeError : ""}`}
    >
      {title && <h3 className={styles.noticeTitle}>{title}</h3>}
      {children}
    </div>
  );
}

function AnalyticsSurvey() {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const surveyService = useService("survey");
  const { surveyId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const visibleQuestions = useProgressiveList(data?.questions ?? [], 5);
  // The editor's numbering ("Q1"), when the design is loaded (survey admins).
  const codeIndex = useSelector((state) => state.designState?.index);

  useEffect(() => {
    setLoading(true);
    surveyService
      .getAnalytics(surveyId)
      .then((data) => {
        startTransition(() => {
          setData(data);
        });
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load analytics:", err);
        setError(err.message || t("analytics.error_loading_data"));
      })
      .finally(() => setLoading(false));
  }, [surveyId]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <LoadingDots fullHeight />
      </div>
    );
  }

  // The response carries no survey title today, so the card names the view.
  const header = (title, note) => (
    <div className={styles.header}>
      <h2 className={styles.headerTitle}>
        {title || t("responses.tab_analytics")}
      </h2>
      {note && <span className={styles.headerNote}>{note}</span>}
    </div>
  );

  const body = (() => {
    if (error) {
      return (
        <Notice error title={t("analytics.error_loading")}>
          {error}
        </Notice>
      );
    }
    if (!data) {
      return <Notice>{t("analytics.no_data")}</Notice>;
    }
    if (data.totalResponses === 0) {
      return (
        <>
          {header(data.surveyTitle, t("analytics.zero_responses"))}
          <Notice title={t("analytics.no_responses_title")}>
            {t("analytics.no_responses_detail")}
          </Notice>
        </>
      );
    }
    if (!data.questions || data.questions.length === 0) {
      return (
        <>
          {header(data.surveyTitle)}
          <Notice title={t("analytics.no_questions_title")}>
            {t("analytics.no_questions_detail")}
          </Notice>
        </>
      );
    }
    return (
      <>
        {header(
          data.surveyTitle,
          t("analytics.questions_count", { count: data.questions.length }),
        )}

        <h3 className={styles.sectionTitle}>
          {t("analytics.section_questions", "Questions")}
        </h3>

        {/* Question cards — rendered progressively */}
        {visibleQuestions.map((question) => {
          const code = codeIndex?.[question.id];
          const titleId = `analytics-q-${question.id}`;
          return (
            <section
              key={question.id}
              aria-labelledby={titleId}
              className={styles.card}
            >
              <h4 id={titleId} className={styles.questionTitle}>
                {code && <span className={styles.questionCode}>{code} · </span>}
                <bdi>{question.title}</bdi>
              </h4>
              <p className={styles.questionType}>
                {getQuestionTypeLabel(question.type, t)}
              </p>
              <LazyRender>
                <QuestionCard
                  question={question}
                  totalResponses={data.totalResponses}
                  incompleteResponses={data.incompleteResponses}
                  previewResponses={data.previewResponses}
                />
              </LazyRender>
            </section>
          );
        })}
      </>
    );
  })();

  return (
    <div className={styles.canvas}>
      <div className={styles.column}>{body}</div>
    </div>
  );
}

export default React.memo(AnalyticsSurvey);
