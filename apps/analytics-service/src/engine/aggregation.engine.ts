import {
  Aggregation,
  AnalyticsMeasure,
} from '../types/analytics.types.js';

export type AnalyticsRow = Record<string, unknown>;

export class AggregationEngine {
  aggregate(
    rows: AnalyticsRow[],
    measure: AnalyticsMeasure,
  ): number {
    const values = rows
      .map((row) => row[measure.field])
      .filter(
        (value): value is number =>
          typeof value === 'number' &&
          Number.isFinite(value),
      );

    switch (measure.aggregation as Aggregation) {
      case 'sum':
        return this.sum(values);

      case 'count':
        return rows.length;

      case 'avg':
        return this.average(values);

      case 'min':
        return this.min(values);

      case 'max':
        return this.max(values);

      default:
        throw new Error(
          `Unsupported aggregation: ${measure.aggregation}`,
        );
    }
  }

  private sum(values: number[]): number {
    return values.reduce(
      (total, value) => total + value,
      0,
    );
  }

  private average(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    return this.sum(values) / values.length;
  }

  private min(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    return Math.min(...values);
  }

  private max(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    return Math.max(...values);
  }
}
