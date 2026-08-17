import React, { useMemo } from 'react';
import useIsFirstRender from '~/hooks/useIsFirstRender';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  LabelList,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import { grey } from '~/theme/palette';
import ChartTooltip, { titleStyle, detailStyle, detailStyleLast, renderLegend } from '../common/ChartTooltip';

function BarTooltip(props) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  return (
    <ChartTooltip {...props} renderContent={(data) => (
      <>
        <p style={titleStyle}>{data.name}</p>
        <p style={detailStyle}>{t('analytics.count_label', { count: data.count })}</p>
        {data.percentage !== undefined && (
          <p style={detailStyleLast}>{t('analytics.percentage_label', { percentage: data.percentage })}</p>
        )}
      </>
    )} />
  );
}

function HorizontalBarChart({
  data,
  dataKey = 'count',
  showGrid = true,
  showValues = true,
  height = 300,
  barSize = 20,
  maxBarSize = 40,
}) {
  const isFirstRender = useIsFirstRender();

  // Calculate dynamic height based on data length
  const dynamicHeight = Math.max(height, data.length * 50);

  // Build legend payload from data entries
  const legendPayload = useMemo(() => data.map((entry) => ({
    value: entry.name,
    type: 'square',
    color: entry.fill,
  })), [data]);

  return (
    <ResponsiveContainer width="100%" height={dynamicHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 50, left: 5, bottom: 20 }}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" horizontal={false} />}
        <XAxis type="number" allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          hide
        />
        <Tooltip content={<BarTooltip />} />
        <Legend content={renderLegend} payload={legendPayload} />
        <Bar
          dataKey={dataKey}
          barSize={barSize}
          maxBarSize={maxBarSize}
          isAnimationActive={isFirstRender}
          animationBegin={0}
          animationDuration={800}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
          {showValues && (
            <LabelList
              dataKey={dataKey}
              position="right"
              fill={grey[700]}
              fontSize={12}
            />
          )}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default React.memo(HorizontalBarChart);
