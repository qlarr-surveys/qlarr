import React from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import LoadingDots from "~/components/common/LoadingDots";
import {
  formatlocalDateTime,
  serverDateTimeToLocalDateTime,
} from "~/utils/DateUtils";
import styles from "./ResponseEvents.module.css";

/**
 * A response's events, one row each: a dot for its kind, what happened
 * (a move between pages, or an answer given), and when, with the time since
 * the event before it.
 */
function ResponseEvents({ events, loading }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);

  if (loading) {
    return (
      <div className={styles.loading}>
        <LoadingDots />
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className={styles.none}>
        {t("responses.no_events", "No events found")}
      </div>
    );
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return "—";
    try {
      const localDate = serverDateTimeToLocalDateTime(timeStr);
      return formatlocalDateTime(localDate);
    } catch {
      return timeStr;
    }
  };

  const getTimeInMs = (timeStr) => {
    if (!timeStr) return null;
    try {
      const localDate = serverDateTimeToLocalDateTime(timeStr);
      return localDate.getTime();
    } catch {
      return null;
    }
  };

  const formatTimeDiff = (milliseconds) => {
    if (!milliseconds || milliseconds < 0) return "—";

    const seconds = milliseconds / 1000;

    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  return (
    <ol aria-label={t("responses.events", "Events")} className={styles.events}>
      {events.map((item, idx) => {
        const { event, responseValue } = item;
        const isNavigation = event?.name === "Navigation";

        const currentTime = getTimeInMs(event?.time);
        const previousTime =
          idx > 0 ? getTimeInMs(events[idx - 1]?.event?.time) : null;
        const timeDiff =
          currentTime && previousTime ? currentTime - previousTime : null;

        const kind = isNavigation
          ? "navigation"
          : responseValue
            ? "value"
            : "other";

        return (
          <li key={idx} className={styles.event}>
            <span
              aria-hidden="true"
              className={`${styles.eventDot} ${
                styles[`eventDot_${kind}`] || ""
              }`}
            />
            <div className={styles.eventBody}>
              {isNavigation && (
                <span dir="auto">
                  {event.from || "Start"} → {event.to || "End"}
                  {event.direction?.name && (
                    <span className={styles.eventSub}>
                      ({event.direction.name})
                    </span>
                  )}
                </span>
              )}
              {responseValue && (
                <span
                  dir="auto"
                  className={isNavigation ? styles.eventSub : undefined}
                >
                  <strong>{responseValue.key}</strong>
                  <span className={styles.eventSub}>
                    {String(responseValue.value)}
                  </span>
                </span>
              )}
              {!isNavigation && !responseValue && (
                <span className={styles.empty}>—</span>
              )}
            </div>
            <div className={styles.eventTime}>
              <span dir="ltr">{formatTime(event?.time)}</span>
              {/* A gap of 0 ms shows nothing, rather than a stray "0". */}
              {timeDiff > 0 && (
                <span className={styles.eventDelta} dir="ltr">
                  +{formatTimeDiff(timeDiff)}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default ResponseEvents;
