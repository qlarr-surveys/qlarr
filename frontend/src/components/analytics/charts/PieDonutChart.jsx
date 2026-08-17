import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useIsFirstRender from '~/hooks/useIsFirstRender';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import ChartTooltip, { titleStyle, detailStyle, detailStyleLast } from '../common/ChartTooltip';

const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Don't show labels for tiny slices

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: 12, fontWeight: 500 }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function PieTooltip(props) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  return (
    <ChartTooltip {...props} renderContent={(data) => (
      <>
        <p style={titleStyle}>{data.name}</p>
        <p style={detailStyle}>{t('analytics.count_label', { count: data.value })}</p>
        <p style={detailStyleLast}>{t('analytics.percentage_label', { percentage: data.percentage })}</p>
      </>
    )} />
  );
}

function PieDonutChart({
  data,
  showLabels = true,
  showLegend = true,
  height = 300,
  outerRadius = 100,
}) {
  const isFirstRender = useIsFirstRender();
  const actualInnerRadius = outerRadius * 0.6;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={showLabels ? renderCustomizedLabel : false}
          innerRadius={actualInnerRadius}
          outerRadius={outerRadius}
          fill="#8884d8"
          dataKey="value"
          isAnimationActive={isFirstRender}
          animationBegin={0}
          animationDuration={800}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip content={<PieTooltip />} />
        {showLegend && (
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ paddingTop: 30 }}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}

export default React.memo(PieDonutChart);
