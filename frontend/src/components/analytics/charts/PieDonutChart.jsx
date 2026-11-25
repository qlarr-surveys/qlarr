import React from 'react';
import { Box } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import useIsFirstRender from '~/hooks/useIsFirstRender';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import ChartTooltip, {
  titleStyle,
  detailStyle,
  detailStyleLast,
} from '../common/ChartTooltip';

function PieTooltip(props) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  return (
    <ChartTooltip
      {...props}
      renderContent={(data) => (
        <>
          <p style={titleStyle}>{data.name}</p>
          <p style={detailStyle}>
            {t('analytics.count_label', { count: data.value })}
          </p>
          <p style={detailStyleLast}>
            {t('analytics.percentage_label', { percentage: data.percentage })}
          </p>
        </>
      )}
    />
  );
}

/**
 * A donut with its legend beside it, as the phase-3.3 analytics cards draw
 * it: slices parted by a 2px surface gap, and each option's share read from
 * the legend rather than printed on the slice. Callers with a legend of their
 * own (icons, images) pass showLegend={false} and get the donut alone.
 */
function PieDonutChart({ data, showLegend = true, outerRadius = 88 }) {
  const isFirstRender = useIsFirstRender();
  const size = outerRadius * 2 + 8;
  const total = data.reduce((sum, entry) => sum + (entry.value || 0), 0);
  const share = (entry) =>
    entry.percentage ??
    (total > 0 ? Math.round((entry.value / total) * 100) : 0);
  // The gap parts two slices; a lone full ring would show it as a seam.
  const sliceGap = data.filter((entry) => entry.value > 0).length > 1 ? 2 : 0;

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '18px 34px',
        my: '6px',
      }}
    >
      <Box sx={{ flex: 'none', width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={false}
              innerRadius={outerRadius * 0.68}
              outerRadius={outerRadius}
              stroke="#fff"
              strokeWidth={sliceGap}
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
          </PieChart>
        </ResponsiveContainer>
      </Box>

      {showLegend && (
        <Box
          component="ul"
          sx={{
            listStyle: 'none',
            m: 0,
            p: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '7px',
            minWidth: 0,
          }}
        >
          {data.map((entry, index) => (
            <Box
              component="li"
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                font: '400 13.5px Rubik, sans-serif',
                color: '#2c3358',
              }}
            >
              <Box
                component="span"
                aria-hidden="true"
                sx={{
                  flex: 'none',
                  width: 12,
                  height: 12,
                  borderRadius: '3px',
                  bgcolor: entry.fill,
                }}
              />
              <span dir="auto">{entry.name}</span>
              <Box component="span" sx={{ color: '#5b6189' }}>
                · {share(entry)}%
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default React.memo(PieDonutChart);
