import { useMemo } from 'react';
import ChartContainer from '../common/ChartContainer';
import FrequencyTable from '../common/FrequencyTable';

export default function TemporalVisualization({ question, extractor, valueLabel }) {
  const data = useMemo(() => {
    const counts = {};
    question.responses.forEach((r) => {
      const key = extractor(r);
      counts[key] = (counts[key] || 0) + 1;
    });
    const total = question.responses.length;
    return Object.entries(counts)
      .map(([value, count]) => ({ value, count, percentage: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [question, extractor]);

  return (
    <ChartContainer>
      <FrequencyTable data={data} valueLabel={valueLabel} />
    </ChartContainer>
  );
}
