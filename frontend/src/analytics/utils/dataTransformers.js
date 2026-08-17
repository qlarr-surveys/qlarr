// Data transformers for converting backend analytics summaries to chart-ready formats
import {
  calculateFrequency,
  calculateEmailDomains,
} from './calculations';
import { getChartColor, NPS_COLORS } from './colors';
import { BACKEND_BASE_URL } from '~/constants/networking';

const MAX_CHART_BAR_ITEMS = 10;
const MAX_DOMAIN_ITEMS = 10;

// Build code→label lookup from AnalyticsOption arrays ({code, label})
const buildLabelMap = (options) =>
  Object.fromEntries((options ?? []).map((o) => [o.code, o.label]));

// Extract just the code strings from AnalyticsOption arrays
const extractCodes = (options) => (options ?? []).map((o) => o.code);

// Largest-remainder rounding: ensures percentages sum to exactly 100
const largestRemainderRound = (items, getCount, total) => {
  if (total === 0 || items.length === 0) return items.map(() => 0);
  const rawPcts = items.map((item) => (getCount(item) / total) * 100);
  const floored = rawPcts.map(Math.floor);
  let remainder = 100 - floored.reduce((a, b) => a + b, 0);
  const remainders = rawPcts.map((raw, i) => ({ i, frac: raw - floored[i] }));
  remainders.sort((a, b) => b.frac - a.frac);
  for (let j = 0; j < remainder && j < remainders.length; j++) {
    floored[remainders[j].i]++;
  }
  return floored;
};

// Calculate average string length from an array of values
const calculateAvgLength = (values, count) =>
  count > 0 ? (values.reduce((sum, v) => sum + v.length, 0) / count).toFixed(1) : 0;

// Shared helper: extract total/answered/skipped/incomplete/preview from any question
const getResponseMetrics = ({ answeredCount, responses, totalResponses, incompleteResponses = 0, previewResponses = 0 }) => {
  const total = totalResponses ?? 0;
  const answered = answeredCount ?? responses?.length ?? 0;
  const incomplete = incompleteResponses;
  const preview = previewResponses;
  const completed = total - incomplete - preview;
  const skipped = Math.max(0, completed - answered);
  return {
    total,
    answered,
    skipped,
    incomplete,
    preview,
    completed,
  };
};

// Apply largest-remainder rounding to chart data items, returns new array with percentage field
const applyRoundedPercentages = (items, total) => {
  const percentages = largestRemainderRound(items, (item) => item.count, total);
  return items.map((item, i) => ({ ...item, percentage: percentages[i] }));
};

// Find all labels tied for the highest count among resolved chart items.
// items: [{ name, count }] -> { topLabels: string[], topCount: number, tied: boolean }
export const computeTopChoice = (items) => {
  if (!items || items.length === 0) return { topLabels: [], topCount: 0, tied: false };
  const maxCount = items.reduce((m, it) => Math.max(m, it.count ?? 0), 0);
  if (maxCount <= 0) return { topLabels: [], topCount: 0, tied: false };
  const topLabels = items.filter((it) => (it.count ?? 0) === maxCount).map((it) => it.name);
  return { topLabels, topCount: maxCount, tied: topLabels.length > 1 };
};

// Resolve relative API image URLs to full URLs
export const resolveImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return BACKEND_BASE_URL + url.replace(/^\//, '');
};

// Build a fast lookup for matching response codes/labels to images
const buildImageLookup = (images) => {
  if (!images || images.length === 0) return () => null;
  const byId = new Map();
  const bySuffix = new Map();
  const byLabel = new Map();
  images.forEach((img) => {
    byId.set(img.id, img);
    if (img.label) byLabel.set(img.label, img);
    const suffix = img.id.match(/([A-Za-z]\d+)$/)?.[1];
    if (suffix) bySuffix.set(suffix, img);
  });
  return (responseValue) => {
    if (!responseValue) return null;
    return byId.get(responseValue) || bySuffix.get(responseValue) || byLabel.get(responseValue) || null;
  };
};

// Attach icon info to matrix rows and columns
const attachIconsToMatrixData = (baseData, images) => {
  const resolveIcon = buildImageLookup(images);
  const attachIcons = (items) => items.map((item) => {
    const image = resolveIcon(item);
    return { key: item, label: image?.label || item, iconUrl: resolveImageUrl(image?.url) };
  });
  return {
    ...baseData,
    columnsWithIcons: attachIcons(baseData.columns),
    rowsWithIcons: attachIcons(baseData.rows),
  };
};

// Pivot flat matrixSummary [{rowCode, columnCode, count}] into grid rows [{row, col1: count, ...}]
const pivotMatrixSummary = (matrixSummary, rowCodes, colCodes) => {
  const grid = rowCodes.map((row) => {
    const rowData = { row };
    colCodes.forEach((col) => (rowData[col] = 0));
    return rowData;
  });
  const rowIndex = new Map(rowCodes.map((r, i) => [r, i]));
  (matrixSummary || []).forEach(({ rowCode, columnCode, count }) => {
    const idx = rowIndex.get(rowCode);
    if (idx !== undefined) {
      grid[idx][columnCode] = count;
    }
  });
  return grid;
};

// Remap matrix data from codes to labels for display
const remapMatrixToLabels = (matrix, rowLabelMap, colLabelMap, colCodes) => {
  return matrix.map((rowData) => {
    const remapped = { row: rowLabelMap[rowData.row] || rowData.row };
    colCodes.forEach((code) => {
      const label = colLabelMap[code] || code;
      remapped[label] = rowData[code] || 0;
    });
    return remapped;
  });
};

// Transform SCQ data for pie/bar charts
export const transformSCQData = (question) => {
  const metrics = getResponseMetrics(question);
  const labelMap = buildLabelMap(question.options);
  const counts = question.frequencyCounts || [];

  const rawItems = counts.map((item, i) => ({
    name: labelMap[item.code] || item.code,
    value: item.count,
    count: item.count,
    fill: getChartColor(i),
  }));
  const chartData = applyRoundedPercentages(rawItems, metrics.completed);
  const topChoice = computeTopChoice(chartData);

  return {
    pieData: chartData,
    barData: chartData,
    ...metrics,
    mode: topChoice.topLabels[0],
    modeCount: topChoice.topCount,
    topChoice,
  };
};

// Transform MCQ data for bar charts
export const transformMCQData = (question) => {
  const metrics = getResponseMetrics(question);
  const labelMap = buildLabelMap(question.options);
  const counts = question.frequencyCounts || [];

  const totalSelections = counts.reduce((sum, item) => sum + item.count, 0);
  const avgSelections = metrics.answered > 0
    ? (totalSelections / metrics.answered).toFixed(1)
    : 0;

  const rawItems = counts.map((item, i) => ({
    name: labelMap[item.code] || item.code,
    value: item.count,
    count: item.count,
    fill: getChartColor(i),
  }));
  const chartData = applyRoundedPercentages(rawItems, totalSelections);
  const topChoice = computeTopChoice(chartData);

  return {
    pieData: chartData,
    barData: chartData,
    ...metrics,
    avgSelections,
    mostPopular: topChoice.topLabels[0],
    topChoice,
  };
};

// Transform NPS data for gauge and bar charts
export const transformNPSData = (question) => {
  const metrics = getResponseMetrics(question);
  const nps = question.npsSummary;
  const total = nps.answeredCount;

  const detractorPct = total > 0 ? Math.round((nps.detractors / total) * 100) : 0;
  const passivePct = total > 0 ? Math.round((nps.passives / total) * 100) : 0;
  const promoterPct = total > 0 ? Math.round((nps.promoters / total) * 100) : 0;

  const rawCategoryData = [
    { name: 'Detractors', value: nps.detractors, count: nps.detractors, fill: NPS_COLORS.detractor },
    { name: 'Passives', value: nps.passives, count: nps.passives, fill: NPS_COLORS.passive },
    { name: 'Promoters', value: nps.promoters, count: nps.promoters, fill: NPS_COLORS.promoter },
  ];
  const categoryData = applyRoundedPercentages(rawCategoryData, metrics.completed);

  const distribution = nps.distribution || Array(11).fill(0);

  return {
    score: Math.round(nps.score),
    categoryData,
    distributionData: distribution.map((count, score) => ({
      score: score.toString(),
      count,
      fill: score <= 6 ? NPS_COLORS.detractor : score <= 8 ? NPS_COLORS.passive : NPS_COLORS.promoter,
    })),
    detractors: nps.detractors,
    passives: nps.passives,
    promoters: nps.promoters,
    detractorPct,
    passivePct,
    promoterPct,
    total: nps.answeredCount,
    ...metrics,
  };
};

// Transform Ranking data for bar charts
export const transformRankingData = (question) => {
  const metrics = getResponseMetrics(question);
  const labelMap = buildLabelMap(question.options);
  const rankings = question.rankingSummary || [];

  return {
    averageRankData: rankings.map((item, i) => ({
      name: labelMap[item.code] || item.code,
      averageRank: item.averageRank,
      firstPlace: item.firstPlaceCount,
      lastPlace: item.lastPlaceCount,
      fill: getChartColor(i),
    })),
    ...metrics,
  };
};

// Transform Number data for table view
export const transformNumberData = (question) => {
  const metrics = getResponseMetrics(question);
  const ns = question.numberSummary;

  const stats = ns ? {
    mean: ns.mean,
    median: ns.median,
    stdDev: ns.stdDev,
    min: ns.min,
    max: ns.max,
    range: Math.round((ns.max - ns.min) * 100) / 100,
    count: ns.count,
    sum: ns.sum,
  } : { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, range: 0, count: 0, sum: 0 };

  const outlierData = ns ? {
    outliers: ns.outlierValues || [],
    outliersCount: ns.outliersCount || 0,
  } : { outliers: [], outliersCount: 0 };

  const frequencyTable = ns?.frequencyTable || [];

  return { stats, outlierData, frequencyTable, ...metrics };
};

// Transform Matrix SCQ data for heatmap
export const transformMatrixSCQData = (question) => {
  const metrics = getResponseMetrics(question);
  const rows = extractCodes(question.rows);
  const columns = extractCodes(question.columns);
  const rowLabelMap = buildLabelMap(question.rows);
  const colLabelMap = buildLabelMap(question.columns);

  const matrix = pivotMatrixSummary(question.matrixSummary, rows, columns);
  const displayMatrix = remapMatrixToLabels(matrix, rowLabelMap, colLabelMap, columns);
  const displayRows = rows.map((r) => rowLabelMap[r] || r);
  const displayColumns = columns.map((c) => colLabelMap[c] || c);

  // Calculate row averages (for Likert scale)
  const rowAverages = displayMatrix.map((rowData) => {
    let sum = 0;
    let count = 0;
    displayColumns.forEach((col, i) => {
      sum += rowData[col] * (i + 1);
      count += rowData[col];
    });
    return { row: rowData.row, average: count > 0 ? (sum / count).toFixed(2) : 0 };
  });

  // Diverging bar data for Likert
  const divergingData = displayColumns.length >= 5 ? displayMatrix.map((rowData) => {
    const rowTotal = displayColumns.reduce((sum, col) => sum + rowData[col], 0);
    if (rowTotal === 0) return { row: rowData.row, negative: '0.0', neutral: '0.0', positive: '0.0' };
    return {
      row: rowData.row,
      negative: ((rowData[displayColumns[0]] + rowData[displayColumns[1]]) / rowTotal * -100).toFixed(1),
      neutral: ((rowData[displayColumns[2]]) / rowTotal * 100).toFixed(1),
      positive: ((rowData[displayColumns[3]] + rowData[displayColumns[4]]) / rowTotal * 100).toFixed(1),
    };
  }) : [];

  return { heatmapData: displayMatrix, rowAverages, divergingData, rows: displayRows, columns: displayColumns, ...metrics };
};

// Transform Matrix MCQ data for heatmap
export const transformMatrixMCQData = (question) => {
  const metrics = getResponseMetrics(question);
  const rows = extractCodes(question.rows);
  const columns = extractCodes(question.columns);
  const rowLabelMap = buildLabelMap(question.rows);
  const colLabelMap = buildLabelMap(question.columns);

  const matrix = pivotMatrixSummary(question.matrixSummary, rows, columns);
  const displayMatrix = remapMatrixToLabels(matrix, rowLabelMap, colLabelMap, columns);
  const displayRows = rows.map((r) => rowLabelMap[r] || r);
  const displayColumns = columns.map((c) => colLabelMap[c] || c);

  // Derive avgSelections from matrix totals
  const totalSelections = (question.matrixSummary || []).reduce((sum, item) => sum + item.count, 0);
  const avgSelections = metrics.answered > 0
    ? (totalSelections / metrics.answered).toFixed(1)
    : 0;

  return { heatmapData: displayMatrix, rows: displayRows, columns: displayColumns, avgSelections, ...metrics };
};

// Transform Text data for word cloud and table
export const transformTextData = (question) => {
  const { responses } = question;
  const metrics = getResponseMetrics(question);
  const frequency = calculateFrequency(responses);

  return {
    frequencyData: frequency,
    uniqueCount: frequency.length,
    ...metrics,
    avgLength: calculateAvgLength(responses, metrics.answered),
  };
};

// Transform Paragraph data — show all raw text values (not frequency-grouped)
export const transformParagraphData = (question) => {
  const { responses } = question;
  const metrics = getResponseMetrics(question);

  return {
    responses,
    ...metrics,
    avgLength: calculateAvgLength(responses, metrics.answered),
  };
};

// Transform Email data
export const transformEmailData = (question) => {
  const { responses } = question;
  const metrics = getResponseMetrics(question);
  const emailStats = calculateEmailDomains(responses);

  // Build per-email frequency map for duplicate detection
  const emailFreq = {};
  responses.forEach((email) => {
    if (email) {
      const key = email.toLowerCase();
      emailFreq[key] = (emailFreq[key] || 0) + 1;
    }
  });

  const emailList = responses.map((email, i) => {
    const key = email ? email.toLowerCase() : '';
    const domain = email && email.includes('@') ? email.split('@')[1]?.toLowerCase() : '';
    return {
      index: i + 1,
      email: email || '',
      domain,
      isDuplicate: emailFreq[key] > 1,
    };
  });

  const duplicateCount = Object.values(emailFreq).filter((c) => c > 1).length;

  return {
    domainData: emailStats.domains.slice(0, MAX_DOMAIN_ITEMS).map((item, i) => ({
      name: item.domain,
      count: item.count,
      percentage: item.percentage,
      fill: getChartColor(i),
    })),
    allDomainData: emailStats.domains.map((item) => ({
      domain: item.domain,
      count: item.count,
      percentage: `${item.percentage}%`,
    })),
    emailList,
    duplicateCount,
    uniqueDomains: emailStats.uniqueDomains,
    ...metrics,
  };
};

// Transform Multiple Text data
export const transformMultipleTextData = (question) => {
  const { fields = [], responses = [] } = question;
  const metrics = getResponseMetrics(question);

  const fieldStats = fields.map((field) => {
    const values = responses.map((r) => r[field.code] || '').filter(Boolean);
    const avgLength = calculateAvgLength(values, values.length);

    return {
      field: field.label,
      completionRate: metrics.total > 0 ? Math.round((values.length / metrics.total) * 100) : 0,
      avgLength,
      count: values.length,
    };
  });

  return { fieldStats, ...metrics };
};

// Transform Autocomplete data (same as SCQ)
export const transformAutocompleteData = transformSCQData;

// Transform Image Ranking data
export const transformImageRankingData = (question) => {
  const { images } = question;
  const metrics = getResponseMetrics(question);
  const labelMap = buildLabelMap(question.options);
  const rankings = question.rankingSummary || [];
  const resolveIcon = buildImageLookup(images);

  const rankedImages = rankings.map((item, i) => {
    const image = resolveIcon(item.code);
    return {
      option: item.code,
      averageRank: item.averageRank,
      name: image?.label || labelMap[item.code] || `Image ${i + 1}`,
      imageUrl: resolveImageUrl(image?.url),
      firstPlace: item.firstPlaceCount,
      lastPlace: item.lastPlaceCount,
      fill: getChartColor(i),
    };
  });

  return { rankedImages, chartData: rankedImages, images, ...metrics };
};

// Transform Image SCQ data
export const transformImageSCQData = (question) => {
  const { images } = question;
  const metrics = getResponseMetrics(question);
  const counts = question.frequencyCounts || [];

  // Build code→count map from backend frequency counts
  const countByCode = new Map(counts.map((fc) => [fc.code, fc.count]));
  const resolveIcon = buildImageLookup(images);

  const rawItems = (images || []).map((img, i) => {
    // Match image to its frequency count via suffix lookup
    const imgSuffix = img.id.match(/([A-Za-z]\d+)$/)?.[1];
    const count = countByCode.get(imgSuffix) || countByCode.get(img.id) || 0;
    return {
      name: img.label || `Image ${i + 1}`,
      value: count,
      count,
      imageUrl: resolveImageUrl(img.url),
      imageId: img.id,
      fill: getChartColor(i),
    };
  }).sort((a, b) => b.value - a.value);
  const pieData = applyRoundedPercentages(rawItems, metrics.completed);
  const topChoice = computeTopChoice(pieData);

  return {
    pieData,
    barData: pieData,
    images,
    ...metrics,
    mode: topChoice.topLabels[0],
    modeCount: topChoice.topCount,
    topChoice,
  };
};

// Transform Image MCQ data
export const transformImageMCQData = (question) => {
  const { images } = question;
  const metrics = getResponseMetrics(question);
  const counts = question.frequencyCounts || [];

  const countByCode = new Map(counts.map((fc) => [fc.code, fc.count]));
  const resolveIcon = buildImageLookup(images);
  const totalSelections = counts.reduce((sum, item) => sum + item.count, 0);

  const rawItems = counts.map((item, i) => {
    const image = resolveIcon(item.code);
    return {
      name: image?.label || `Image ${i + 1}`,
      value: item.count,
      count: item.count,
      imageUrl: resolveImageUrl(image?.url),
      imageId: image?.id,
      fill: getChartColor(i),
    };
  });
  const barData = applyRoundedPercentages(rawItems, totalSelections);
  const topChoice = computeTopChoice(barData);

  return {
    barData,
    images,
    ...metrics,
    mostPopular: topChoice.topLabels[0],
    topChoice,
  };
};

// Transform Icon SCQ data for pie/bar charts with icon support
export const transformIconSCQData = (question) => {
  const metrics = getResponseMetrics(question);
  const images = question.images || [];
  const counts = question.frequencyCounts || [];

  const resolveIcon = buildImageLookup(images);
  const rawItems = counts.map((item, i) => {
    const image = resolveIcon(item.code);
    return {
      name: image?.label || `Option ${i + 1}`,
      value: item.count,
      count: item.count,
      iconUrl: resolveImageUrl(image?.url),
      imageId: image?.id,
      fill: getChartColor(i),
    };
  });
  const chartData = applyRoundedPercentages(rawItems, metrics.completed);
  const topChoice = computeTopChoice(chartData);

  return {
    pieData: chartData,
    barData: chartData,
    ...metrics,
    mode: topChoice.topLabels[0],
    modeCount: topChoice.topCount,
    topChoice,
  };
};

// Transform Icon MCQ data for bar charts with icon support
export const transformIconMCQData = (question) => {
  const metrics = getResponseMetrics(question);
  const images = question.images || [];
  const counts = question.frequencyCounts || [];

  const totalSelections = counts.reduce((sum, item) => sum + item.count, 0);
  const avgSelections = metrics.answered > 0
    ? (totalSelections / metrics.answered).toFixed(1)
    : 0;

  const resolveIcon = buildImageLookup(images);

  const rawItems = counts.map((item, i) => {
    const image = resolveIcon(item.code);
    return {
      name: image?.label || `Option ${i + 1}`,
      value: item.count,
      count: item.count,
      iconUrl: resolveImageUrl(image?.url),
      imageId: image?.id,
      fill: getChartColor(i),
    };
  });
  const barData = applyRoundedPercentages(rawItems, totalSelections);
  const topChoice = computeTopChoice(barData);

  return {
    barData,
    ...metrics,
    avgSelections,
    mostPopular: topChoice.topLabels[0],
    topChoice,
  };
};

// Transform Icon Matrix SCQ data (SCQ_ICON_ARRAY)
export const transformIconMatrixSCQData = (question) =>
  attachIconsToMatrixData(transformMatrixSCQData(question), question.images || []);

// Transform Icon Matrix MCQ data (MCQ_ICON_ARRAY)
export const transformIconMatrixMCQData = (question) =>
  attachIconsToMatrixData(transformMatrixMCQData(question), question.images || []);

// Transform File Upload data
export const transformFileUploadData = (question) => {
  const { responses } = question;
  const metrics = getResponseMetrics(question);
  const extCounts = {};

  responses.forEach((r) => {
    if (r?.filename) {
      const ext = r.filename.split('.').pop().toLowerCase();
      extCounts[ext] = (extCounts[ext] || 0) + 1;
    }
  });

  const rawItems = Object.entries(extCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const extensionData = applyRoundedPercentages(rawItems, responses.length);

  return {
    extensionData,
    ...metrics,
  };
};

// Shared helper for presence-based visualizations (Signature, PhotoCapture, MediaCapture)
const transformPresenceData = (question, presentLabel, absentLabel, presentKey, absentKey) => {
  const metrics = getResponseMetrics(question);
  const presence = question.presenceCount;
  const presentCount = presence?.presentCount ?? 0;
  const absentCount = Math.max(0, metrics.answered - presentCount);

  const rawItems = [
    { name: presentLabel, value: presentCount, count: presentCount },
    { name: absentLabel, value: absentCount, count: absentCount },
  ];
  const chartData = applyRoundedPercentages(rawItems, metrics.completed);

  return {
    completionRate: metrics.completed > 0 ? Math.round((presentCount / metrics.completed) * 100) : 0,
    [presentKey]: presentCount,
    [absentKey]: absentCount,
    chartData,
    ...metrics,
  };
};

// Transform Signature data
export const transformSignatureData = (question) =>
  transformPresenceData(question, 'Signed', 'Unsigned', 'signed', 'unsigned');

// Transform Photo Capture data
export const transformPhotoCaptureData = (question) =>
  transformPresenceData(question, 'Captured', 'Not Captured', 'captured', 'notCaptured');

// Transform Barcode data
export const transformBarcodeData = (question) => {
  const { responses } = question;
  const metrics = getResponseMetrics(question);
  const frequency = calculateFrequency(responses);
  const duplicates = frequency.filter((f) => f.count > 1);

  const rawItems = frequency.slice(0, MAX_CHART_BAR_ITEMS).map((item, i) => ({
    name: item.value,
    value: item.count,
    count: item.count,
    fill: getChartColor(i),
  }));
  const barData = applyRoundedPercentages(rawItems, metrics.completed);

  return {
    frequencyData: frequency,
    barData,
    uniqueCount: frequency.length,
    duplicateCount: duplicates.length,
    ...metrics,
  };
};

// Alias for MediaCapture (same as PhotoCapture)
export const transformMediaCaptureData = transformPhotoCaptureData;
