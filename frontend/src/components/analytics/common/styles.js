// Class for a body cell in the muted ink; see TABLE_SX.
export const MUTED_CELL = 'analytics-muted-cell';

export const TABLE_HEADER_CELL_SX = {
  font: '600 11.5px Rubik, sans-serif',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#4c5474',
};

// The phase-3.3 table on an analytics card: no frame, a tinted header band,
// and hairlines between rows. Set on the TableContainer, it reaches every
// cell, so the tables only add what differs per column.
export const TABLE_SX = {
  border: 0,
  borderRadius: 0,
  boxShadow: 'none',
  bgcolor: 'transparent',
  '& .MuiTableHead-root .MuiTableCell-root': {
    ...TABLE_HEADER_CELL_SX,
    bgcolor: '#f3f4fa',
    py: '10px',
    px: '14px',
    borderBottom: 0,
  },
  '& .MuiTableBody-root .MuiTableCell-root': {
    py: '10px',
    px: '14px',
    borderBottom: 0,
    borderTop: '1px solid #eef0f8',
    fontFamily: 'Rubik, sans-serif',
    fontSize: 14,
    lineHeight: '20px',
    color: '#2c3358',
    verticalAlign: 'top',
  },
  // Secondary columns (the %, a row number) in the muted ink.
  [`& .MuiTableBody-root .MuiTableCell-root.${MUTED_CELL}`]: {
    color: '#5b6189',
  },
};

export const EMPTY_STATE_SX = {
  p: 4,
  textAlign: 'center',
  color: '#5b6189',
};
