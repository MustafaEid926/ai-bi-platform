import {
  AnalyticsFilter,
  FilterOperator,
} from '../types/analytics.types.js';

export type AnalyticsRow = Record<string, unknown>;

export class FilterEngine {
  apply(
    rows: AnalyticsRow[],
    filters: AnalyticsFilter[] = [],
  ): AnalyticsRow[] {
    if (filters.length === 0) {
      return rows;
    }

    return rows.filter((row) =>
      filters.every((filter) =>
        this.matches(row, filter),
      ),
    );
  }

  private matches(
    row: AnalyticsRow,
    filter: AnalyticsFilter,
  ): boolean {
    const fieldValue = row[filter.field];
    const filterValue = filter.value;

    switch (filter.operator as FilterOperator) {
      case 'eq':
        return fieldValue === filterValue;

      case 'neq':
        return fieldValue !== filterValue;

      case 'gt':
        return this.compare(fieldValue, filterValue) > 0;

      case 'gte':
        return this.compare(fieldValue, filterValue) >= 0;

      case 'lt':
        return this.compare(fieldValue, filterValue) < 0;

      case 'lte':
        return this.compare(fieldValue, filterValue) <= 0;

      default:
        return false;
    }
  }

  private compare(
    left: unknown,
    right: unknown,
  ): number {
    if (
      typeof left === 'number' &&
      typeof right === 'number'
    ) {
      return left - right;
    }

    return String(left).localeCompare(String(right));
  }
}
