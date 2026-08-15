import React from 'react';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import { grey, success, warning, error } from '~/theme/palette';

function CompletionCard({
  rate,
  completed,
  total,
  label,
  color = success.main,
  size = 'medium',
}) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const sizeClasses = {
    small: { width: 128, height: 128 },
    medium: { width: 160, height: 160 },
    large: { width: 192, height: 192 },
  };

  const fontSizes = {
    small: { rate: 24, label: 12, count: 12 },
    medium: { rate: 30, label: 14, count: 14 },
    large: { rate: 36, label: 16, count: 16 },
  };

  const strokeWidth = size === 'small' ? 6 : size === 'medium' ? 8 : 10;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const safeRate = Number.isFinite(rate) ? rate : 0;
  const strokeDashoffset = circumference * (1 - safeRate / 100);

  const getColor = () => {
    if (rate >= 80) return success.main;
    if (rate >= 50) return warning.main;
    return error.dark;
  };

  const finalColor = color === 'auto' ? getColor() : color;
  const containerSize = sizeClasses[size];
  const fonts = fontSizes[size];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: containerSize.width, height: containerSize.height }}>
        <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke={grey[300]}
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke={finalColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontWeight: 'bold', fontSize: fonts.rate, color: finalColor }}>
            {rate}%
          </span>
          <span style={{ color: grey[600], fontSize: fonts.label }}>{label || t('analytics.completion_rate')}</span>
        </div>
      </div>
      <div style={{ marginTop: 8, textAlign: 'center', fontSize: fonts.count }}>
        <span style={{ color: grey[600] }}>
          {t('analytics.completed_count', { completed, total })}
        </span>
      </div>
    </div>
  );
}

export default React.memo(CompletionCard);
