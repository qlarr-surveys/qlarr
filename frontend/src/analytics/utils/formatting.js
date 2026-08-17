// Number formatting utilities for analytics

/**
 * Format number with context-aware display
 * @param {number} value - The number to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted number string
 */
export const formatNumber = (value, options = {}) => {
  const {
    context = 'full',      // 'full' | 'abbreviated' | 'chart'
    decimals = 2,          // Number of decimal places
    forceDecimals = false  // Always show decimals even for integers
  } = options;

  if (value === null || value === undefined || isNaN(value)) return '-';

  // For 'full' context (stat cards)
  if (context === 'full') {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: forceDecimals ? decimals : 0,
      maximumFractionDigits: decimals
    });
  }

  // For 'abbreviated' or 'chart' context
  const absValue = Math.abs(value);

  if (absValue >= 1e9) {
    return `${(value / 1e9).toFixed(decimals)}B`;
  } else if (absValue >= 1e6) {
    return `${(value / 1e6).toFixed(decimals)}M`;
  } else if (absValue >= 1e3) {
    return `${(value / 1e3).toFixed(decimals)}K`;
  }

  return value.toFixed(decimals);
};
