export type Aggregation = 'sum' | 'count' | 'avg' | 'min' | 'max';

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte';

export interface AnalyticsMeasure {
  field: string;
  aggregation: Aggregation;
  alias?: string;
}

export interface AnalyticsFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export interface AnalyticsQuery {
  datasetId: string;
  versionId: string;
  dimensions: string[];
  measures: AnalyticsMeasure[];
  filters?: AnalyticsFilter[];
}

export interface AnalyticsResult {
  queryId: string;
  definition: AnalyticsQuery;
  columns: string[];
  rows: unknown[][];
  executionTimeMs: number;
}