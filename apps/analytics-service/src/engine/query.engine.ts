import {
  AnalyticsMeasure,
} from '../types/analytics.types.js';

import {
  AggregationEngine,
  AnalyticsRow,
} from './aggregation.engine.js';

export interface QueryEngineInput {
  dimensions: string[];
  measures: AnalyticsMeasure[];
}

export class QueryEngine {
  constructor(
    private readonly aggregationEngine: AggregationEngine,
  ) {}

  execute(
    rows: AnalyticsRow[],
    query: QueryEngineInput,
  ): AnalyticsRow[] {
    if (query.dimensions.length === 0) {
      return [
        this.aggregateGroup(
          rows,
          query.measures,
        ),
      ];
    }

    const groups = this.groupBy(
      rows,
      query.dimensions,
    );

    return Array.from(groups.values()).map(
      (groupRows) =>
        this.aggregateGroup(
          groupRows,
          query.measures,
          query.dimensions,
        ),
    );
  }

  private groupBy(
    rows: AnalyticsRow[],
    dimensions: string[],
  ): Map<string, AnalyticsRow[]> {
    const groups = new Map<
      string,
      AnalyticsRow[]
    >();

    for (const row of rows) {
      const key = JSON.stringify(
        dimensions.map(
          (dimension) => row[dimension],
        ),
      );

      const existing = groups.get(key);

      if (existing) {
        existing.push(row);
      } else {
        groups.set(key, [row]);
      }
    }

    return groups;
  }

  private aggregateGroup(
    rows: AnalyticsRow[],
    measures: AnalyticsMeasure[],
    dimensions: string[] = [],
  ): AnalyticsRow {
    const result: AnalyticsRow = {};

    for (const dimension of dimensions) {
      result[dimension] = rows[0]?.[dimension] ?? null;
    }

    for (const measure of measures) {
      const alias =
        measure.alias ??
        `${measure.aggregation}_${measure.field}`;

      result[alias] =
        this.aggregationEngine.aggregate(
          rows,
          measure,
        );
    }

    return result;
  }
}
