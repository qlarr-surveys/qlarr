import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';

/** Renders a CrosstabResultDto: cells with significance letters + base rows. */
export default function CrosstabTable({ result, options }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const { columns, rows, weighting } = result;
  const showCount = options.counts;
  const showPct = options.pct;
  const showSig = options.significance;

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell />
            {columns.map((c) => (
              <TableCell key={c.code} align="center">
                {c.label}
                <Box component="span" sx={{ display: 'block', fontSize: 11, color: 'text.disabled' }}>
                  ({c.letter})
                </Box>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.code} hover>
              <TableCell sx={{ color: 'text.secondary' }}>{row.label}</TableCell>
              {row.cells.map((cell, i) => {
                const col = columns[i];
                if (col.lowBase) {
                  return (
                    <TableCell key={col.code} align="center">
                      <Box component="span" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                        {cell.count}
                      </Box>
                    </TableCell>
                  );
                }
                return (
                  <TableCell key={col.code} align="center">
                    {showCount && <span>{cell.count}</span>}
                    {showCount && showPct && ' '}
                    {showPct && (
                      <Box component="span" sx={{ color: 'text.secondary' }}>
                        {Math.round(cell.pct * 100)}%
                      </Box>
                    )}
                    {showSig && cell.beats.length > 0 && (
                      <Box component="span" sx={{ color: 'primary.main', fontWeight: 600, ml: 0.5 }}>
                        {cell.beats.join('')}
                      </Box>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}

          <TableRow>
            <TableCell sx={{ color: 'text.secondary', borderBottom: 'none' }}>
              {t('crosstabs.base', 'Base')}
            </TableCell>
            {columns.map((c) => (
              <TableCell key={c.code} align="center" sx={{ color: 'text.secondary', borderBottom: 'none' }}>
                {c.base}
                {weighting && (
                  <Box component="span" sx={{ color: 'text.disabled' }}>
                    {' · '}
                    {t('crosstabs.eff', 'eff')} {c.effectiveBase}
                  </Box>
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
