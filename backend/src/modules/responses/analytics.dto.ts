/** Analytics DTOs. Null summary fields are omitted from the JSON. */

export interface AnalyticsOption {
  code: string;
  label: string;
}

export interface AnalyticsImage {
  id: string;
  label?: string;
  url?: string;
}

export interface FrequencyCount {
  code: string;
  count: number;
}

export interface NpsSummary {
  detractors: number;
  passives: number;
  promoters: number;
  score: number;
  answeredCount: number;
  distribution: number[];
}

export interface NumberFrequencyItem {
  value: number;
  count: number;
}

export interface NumberSummary {
  min: number;
  max: number;
  mean: number;
  median: number;
  sum: number;
  count: number;
  stdDev: number;
  frequencyTable: NumberFrequencyItem[];
  outlierValues: number[];
  outliersCount: number;
}

export interface RankingSummaryItem {
  code: string;
  averageRank: number;
  responseCount: number;
  firstPlaceCount: number;
  lastPlaceCount: number;
}

export interface MatrixSummaryItem {
  rowCode: string;
  columnCode: string;
  count: number;
}

export interface PresenceCount {
  presentCount: number;
  totalResponses: number;
}

export interface AnalyticsQuestion {
  id: string;
  type: string;
  title: string;
  answeredCount: number;
  options?: AnalyticsOption[];
  rows?: AnalyticsOption[];
  columns?: AnalyticsOption[];
  images?: AnalyticsImage[];
  fields?: AnalyticsOption[];
  frequencyCounts?: FrequencyCount[];
  npsSummary?: NpsSummary;
  numberSummary?: NumberSummary;
  rankingSummary?: RankingSummaryItem[];
  matrixSummary?: MatrixSummaryItem[];
  presenceCount?: PresenceCount;
  responses?: unknown[];
}

export interface AnalyticsDto {
  totalResponses: number;
  incompleteResponses: number;
  questions: AnalyticsQuestion[];
}
