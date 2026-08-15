import React from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import LoadingDots from "~/components/common/LoadingDots";
import {
  formatlocalDateTime,
  serverDateTimeToLocalDateTime,
} from "~/utils/DateUtils";

function ResponseEvents({ events, loading }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);

  if (loading) {
    return (
      <Box p={2}>
        <LoadingDots />
      </Box>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Typography color="text.secondary">
          {t("responses.no_events", "No events found")}
        </Typography>
      </Box>
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
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ backgroundColor: "#212B36", color: "white" }}>
              {t("responses.event_navigation", "Navigation")}
            </TableCell>
            <TableCell sx={{ backgroundColor: "#212B36", color: "white" }}>
              {t("responses.event_time", "Time")}
            </TableCell>
            <TableCell sx={{ backgroundColor: "#212B36", color: "white" }}>
              {t("responses.event_value", "Value")}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {events.map((item, idx) => {
            const { event, responseValue } = item;
            const isNavigation = event?.name === "Navigation";

            const currentTime = getTimeInMs(event?.time);
            const previousTime = idx > 0 ? getTimeInMs(events[idx - 1]?.event?.time) : null;
            const timeDiff = currentTime && previousTime ? currentTime - previousTime : null;

            return (
              <TableRow key={idx} hover>
                <TableCell sx={{ verticalAlign: "top" }}>
                  {isNavigation ? (
                    <Typography variant="body2">
                      {event.from || "Start"} → {event.to || "End"}
                      {event.direction?.name && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          ({event.direction.name})
                        </Typography>
                      )}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ verticalAlign: "top" }}>
                  <Typography variant="body2">
                    {formatTime(event?.time)}
                  </Typography>
                  {timeDiff && (
                    <Typography variant="caption" display="block" color="primary.main">
                      +{formatTimeDiff(timeDiff)}
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ verticalAlign: "top" }}>
                  {responseValue ? (
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {responseValue.key}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {String(responseValue.value)}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default ResponseEvents;
