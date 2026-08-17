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
import usePagination from '~/hooks/usePagination';
import { TABLE_HEADER_CELL_SX, EMPTY_STATE_SX } from './styles';

export default function FrequencyTable({
  data,
  valueLabel,
  countLabel,
  emptyMessage,
  paginated = true,
  rowsPerPage = 10,
}) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const { displayData, totalPages, safePage, startRow, endRow, handlePageChange } = usePagination(data, rowsPerPage, paginated);

  if (!data || data.length === 0) {
    return (
      <Box sx={EMPTY_STATE_SX}>
        <Typography variant="body1">{emptyMessage || t('analytics.no_data_available')}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={TABLE_HEADER_CELL_SX}>
                {valueLabel || t('analytics.col_value')}
              </TableCell>
              <TableCell align="right" sx={TABLE_HEADER_CELL_SX}>
                {countLabel || t('analytics.col_count')}
              </TableCell>
              <TableCell align="right" sx={TABLE_HEADER_CELL_SX}>
                %
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayData.map((item, index) => (
              <TableRow key={index} hover>
                <TableCell sx={{ fontWeight: 500, color: 'text.primary' }}>
                  {item.value || item.text || item.name}
                </TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary' }}>
                  {item.count || item.value}
                </TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary' }}>
                  {item.percentage}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {paginated && totalPages > 1 && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('analytics.showing_rows', { start: startRow, end: endRow, total: data.length })}
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
  );
}
