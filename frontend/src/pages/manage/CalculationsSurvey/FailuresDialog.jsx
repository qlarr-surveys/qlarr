import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from "@mui/material";
import { useService } from "~/hooks/use-service";
import LoadingDots from "~/components/common/LoadingDots";

const PER_PAGE = 10;

/**
 * A page at a time of a job subject's failed responses: id and error. Mounted
 * only while open, so it starts on the first page each time.
 */
function FailuresDialog({ onClose, surveyId, kind, subjectKey, t }) {
  const surveyService = useService("survey");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let current = true;
    setError(false);
    surveyService
      .jobFailures(surveyId, kind, subjectKey, page, PER_PAGE)
      .then((next) => current && setData(next))
      .catch(() => current && setError(true));
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, surveyId, kind, subjectKey]);

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {t("calculations.failures_title", "Failed responses")}
      </DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error">
            {t("calculations.failures_error_loading", "Failed to load failures")}
          </Alert>
        ) : !data ? (
          <LoadingDots />
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      {t("calculations.sample_response", "Response")}
                    </TableCell>
                    <TableCell>{t("calculations.state_error", "Error")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.failures.map((f) => (
                    <TableRow key={f.responseId}>
                      <TableCell sx={{ fontFamily: "monospace" }}>
                        {f.responseId}
                      </TableCell>
                      <TableCell>{f.error}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              rowsPerPageOptions={[PER_PAGE]}
              rowsPerPage={PER_PAGE}
              count={data.totalCount}
              page={page - 1}
              onPageChange={(_, next) => setPage(next + 1)}
              labelDisplayedRows={({ from, to, count }) =>
                t("responses.label_displayed_rows", { from, to, count })
              }
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("action_btn.close")}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default React.memo(FailuresDialog);
