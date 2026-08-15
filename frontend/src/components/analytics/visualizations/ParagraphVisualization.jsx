import { useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Pagination,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import ChartContainer from '../common/ChartContainer';
import { StatsRow } from '../common/StatCard';
import { buildBaseStats } from '../common/buildBaseStats';
import { TABLE_HEADER_CELL_SX, EMPTY_STATE_SX } from '../common/styles';
import { transformParagraphData } from '~/analytics/utils/dataTransformers';
import usePagination from '~/hooks/usePagination';

const ROWS_PER_PAGE = 10;

export default function ParagraphVisualization({ question }) {
  const data = useMemo(() => transformParagraphData(question), [question]);
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const { displayData, totalPages, safePage, startRow, endRow, handlePageChange } = usePagination(data.responses, ROWS_PER_PAGE);

  const stats = [
    ...buildBaseStats(data, t),
    { label: t('analytics.avg_length'), value: t('analytics.chars', { length: data.avgLength }) },
  ];

  return (
    <ChartContainer>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <StatsRow stats={stats} columns={3} />
        {data.responses.length === 0 ? (
          <Box sx={EMPTY_STATE_SX}>
            <Typography variant="body1">{t('analytics.no_responses_available')}</Typography>
          </Box>
        ) : (
          <Box>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ ...TABLE_HEADER_CELL_SX, width: 60 }}>
                      #
                    </TableCell>
                    <TableCell sx={TABLE_HEADER_CELL_SX}>
                      {t('analytics.col_response')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayData.map((response, index) => (
                    <TableRow key={startRow + index} hover>
                      <TableCell sx={{ color: 'text.secondary', width: 60 }}>
                        {startRow + index}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500, color: 'text.primary', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {response}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {totalPages > 1 && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('analytics.showing_responses', { start: startRow, end: endRow, total: data.responses.length })}
                </Typography>
                <Pagination
                  count={totalPages}
                  page={safePage}
                  onChange={handlePageChange}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </Box>
        )}
      </Box>
    </ChartContainer>
  );
}
