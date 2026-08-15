import React, { useState, useMemo } from 'react';
import { Box, Typography, Pagination } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import { grey, common, info } from '~/theme/palette';
import { getHeatmapColor } from '~/analytics/utils/colors';

function HeatmapChart({
  data,
  rows,
  columns,
  rowsWithIcons,
  height = 'auto',
  cellSize = 50,
  showValues = true,
  colorScale = { low: info.lighter, high: info.dark },
  paginated = true,
  rowsPerPage = 10,
}) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const [currentPage, setCurrentPage] = useState(1);

  // Resolve column key (supports both string and {key, label, iconUrl} objects)
  const colKey = (col) => (typeof col === 'object' ? col.key : col);

  // Resolve row display info from rowsWithIcons (if provided)
  const getRowInfo = (rowKey) => {
    if (!rowsWithIcons) return { label: rowKey, iconUrl: null };
    const found = rowsWithIcons.find((r) => r.key === rowKey);
    return found || { label: rowKey, iconUrl: null };
  };

  // Find max value for color scaling
  const maxValue = Math.max(
    ...data.flatMap((row) => columns.map((col) => row[colKey(col)] || 0))
  );

  const getCellColor = (value) => {
    if (maxValue === 0) return colorScale.low;
    const intensity = value / maxValue;
    return getHeatmapColor(intensity, colorScale.low, colorScale.high);
  };

  const getTextColor = (value) => {
    const intensity = maxValue > 0 ? value / maxValue : 0;
    return intensity > 0.5 ? common.white : grey[800];
  };

  const totalPages = Math.ceil(data.length / rowsPerPage);
  const safePage = Math.min(currentPage, totalPages || 1);

  const displayData = useMemo(() => {
    if (!paginated) return data;
    const start = (safePage - 1) * rowsPerPage;
    return data.slice(start, start + rowsPerPage);
  }, [data, safePage, rowsPerPage, paginated]);

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  const startRow = (safePage - 1) * rowsPerPage + 1;
  const endRow = Math.min(safePage * rowsPerPage, data.length);

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', margin: '0 auto' }}>
          <thead>
            <tr>
              <th style={{
                padding: 8,
                textAlign: 'left',
                fontSize: 14,
                fontWeight: 500,
                color: grey[700],
                backgroundColor: grey[100]
              }}></th>
              {columns.map((col, i) => {
                const label = typeof col === 'object' ? col.label : col;
                const iconUrl = typeof col === 'object' ? col.iconUrl : null;
                return (
                  <th
                    key={i}
                    style={{
                      padding: 8,
                      textAlign: 'center',
                      fontSize: 14,
                      fontWeight: 500,
                      color: grey[700],
                      backgroundColor: grey[100],
                      minWidth: cellSize
                    }}
                  >
                    {iconUrl ? (
                      <img
                        src={iconUrl}
                        alt={label}
                        title={label}
                        style={{ width: 40, height: 40, objectFit: 'contain', display: 'block', margin: '0 auto' }}
                      />
                    ) : (
                      label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {displayData.map((rowData, rowIndex) => (
              <tr key={rowIndex}>
                <td style={{
                  padding: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  color: grey[700],
                  backgroundColor: grey[100],
                  whiteSpace: 'nowrap'
                }}>
                  {(() => {
                    const rowInfo = getRowInfo(rowData.row);
                    return (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {rowInfo.iconUrl ? (
                          <img
                            src={rowInfo.iconUrl}
                            alt={rowInfo.label}
                            title={rowInfo.label}
                            style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }}
                          />
                        ) : (
                          rowInfo.label
                        )}
                      </span>
                    );
                  })()}
                </td>
                {columns.map((col, colIndex) => {
                  const value = rowData[colKey(col)] || 0;
                  return (
                    <td
                      key={colIndex}
                      style={{
                        padding: 0,
                        textAlign: 'center',
                        backgroundColor: getCellColor(value),
                        width: cellSize,
                        height: cellSize,
                        transition: 'background-color 0.2s'
                      }}
                    >
                      {showValues && (
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: getTextColor(value)
                          }}
                        >
                          {value}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Color Legend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 16,
        gap: 8
      }}>
        <span style={{ fontSize: 12, color: grey[600] }}>{t('analytics.low')}</span>
        <div
          style={{
            width: 96,
            height: 12,
            borderRadius: 4,
            background: `linear-gradient(to right, ${colorScale.low}, ${colorScale.high})`
          }}
        />
        <span style={{ fontSize: 12, color: grey[600] }}>{t('analytics.high')}</span>
      </div>

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
    </div>
  );
}

export default React.memo(HeatmapChart);
