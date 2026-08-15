import React from 'react';
import { useInView } from 'react-intersection-observer';
import { Box, Skeleton } from '@mui/material';

function LazyRender({ children, minHeight = 200, rootMargin = '200px 0px', sx }) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin,
  });

  return (
    <Box ref={ref} sx={{ minHeight: inView ? 'auto' : minHeight, ...sx }}>
      {inView ? (
        children
      ) : (
        <Skeleton variant="rounded" width="100%" height={minHeight} sx={{ borderRadius: 2 }} />
      )}
    </Box>
  );
}

export default React.memo(LazyRender);
