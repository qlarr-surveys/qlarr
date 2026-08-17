import { useState, useEffect } from 'react';

const schedule = window.requestIdleCallback || ((cb) => setTimeout(cb, 100));
const cancel = window.cancelIdleCallback || clearTimeout;

export default function useProgressiveList(items, batchSize = 5) {
  const [visibleCount, setVisibleCount] = useState(batchSize);

  useEffect(() => {
    setVisibleCount(batchSize);
  }, [items.length, batchSize]);

  useEffect(() => {
    if (visibleCount >= items.length) return;
    const id = schedule(() => {
      setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
    });
    return () => cancel(id);
  }, [visibleCount, items.length, batchSize]);

  return items.slice(0, visibleCount);
}
