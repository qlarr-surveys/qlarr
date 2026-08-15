import { useState, useMemo } from 'react';

export default function usePagination(data, rowsPerPage = 10, paginated = true) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = data?.length ? Math.ceil(data.length / rowsPerPage) : 0;
  const safePage = Math.min(currentPage, totalPages || 1);

  const displayData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (!paginated) return data;
    const start = (safePage - 1) * rowsPerPage;
    return data.slice(start, start + rowsPerPage);
  }, [data, safePage, rowsPerPage, paginated]);

  const startRow = (safePage - 1) * rowsPerPage + 1;
  const endRow = Math.min(safePage * rowsPerPage, data?.length || 0);

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  return { displayData, currentPage, totalPages, safePage, startRow, endRow, handlePageChange };
}
