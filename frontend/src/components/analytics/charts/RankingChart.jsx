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
import { grey, success, error } from '~/theme/palette';
import { getChartColor } from '~/analytics/utils/colors';
import ChartTooltip, { titleStyle, detailStyle, detailStyleLast, renderLegend } from '../common/ChartTooltip';

function RankingTooltip(props) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  return (
    <ChartTooltip {...props} renderContent={(data) => (
      <>
        <p style={titleStyle}>{data.name}</p>
        <p style={detailStyle}>{t('analytics.average_rank_label', { rank: data.averageRank })}</p>
        <p style={detailStyle}>{t('analytics.first_place_label', { count: data.firstPlace })}</p>
        <p style={detailStyleLast}>{t('analytics.last_place_label', { count: data.lastPlace })}</p>
      </>
    )} />
  );
}

function RankingChart({
  data,
  height = 300,
  showFirstLast = true,
}) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const isFirstRender = useIsFirstRender();
  // Sort by average rank (lower is better)
  const sortedData = useMemo(() => [...data].sort((a, b) => a.averageRank - b.averageRank), [data]);

  const legendPayload = useMemo(() => sortedData.map((entry, index) => ({
    value: entry.name,
    type: 'square',
    color: getChartColor(index),
  })), [sortedData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Average Rank Bar Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 5, right: 50, left: 5, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            domain={[1, sortedData.length]}
            tick={{ fontSize: 12 }}
            label={{ value: t('analytics.average_rank_axis'), position: 'bottom', fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            hide
          />
          <Tooltip content={<RankingTooltip />} />
          <Legend content={renderLegend} payload={legendPayload} />
          <Bar
            dataKey="averageRank"
            isAnimationActive={isFirstRender}
            animationBegin={0}
            animationDuration={800}
            barSize={25}
          >
            {sortedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getChartColor(index)} />
            ))}
            <LabelList
              dataKey="averageRank"
              position="right"
              fill={grey[700]}
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* First/Last Place Summary */}
      {showFirstLast && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 16 }}>
          <div style={{ backgroundColor: success.lighter, borderRadius: 8, padding: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 500, color: success.dark, marginBottom: 8 }}>{t('analytics.most_first_place_votes')}</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {sortedData
                .sort((a, b) => b.firstPlace - a.firstPlace)
                .slice(0, 3)
                .map((item, i) => (
                  <li key={i} style={{ fontSize: 14, color: success.dark, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.name}</span>
                    <span style={{ fontWeight: 500 }}>{item.firstPlace}</span>
                  </li>
                ))}
            </ul>
          </div>
          <div style={{ backgroundColor: error.lighter, borderRadius: 8, padding: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 500, color: error.darker, marginBottom: 8 }}>{t('analytics.most_last_place_votes')}</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {sortedData
                .sort((a, b) => b.lastPlace - a.lastPlace)
                .slice(0, 3)
                .map((item, i) => (
                  <li key={i} style={{ fontSize: 14, color: error.dark, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.name}</span>
                    <span style={{ fontWeight: 500 }}>{item.lastPlace}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(RankingChart);
