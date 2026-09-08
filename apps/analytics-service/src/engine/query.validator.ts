import {
  Aggregation,
  AnalyticsFilter,
  AnalyticsMeasure,
  AnalyticsQuery,
} from '../types/analytics.types.js';

import {
  DatasetSchema,
  FieldType,
} from './schema.inference.js';

import { AppError } from '@aibi/errors';

export class QueryValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(
      'QUERY_VALIDATION_ERROR',
      400,
      message,
      details,
    );

    this.name = 'QueryValidationError';
  }
}


export class QueryValidator {
  validate(
    query: AnalyticsQuery,
    schema: DatasetSchema,
  ): void {
    const fields = new Map(
      schema.fields.map((field) => [
        field.name,
        field.type,
      ]),
    );

    this.validateDimensions(
      query.dimensions,
      fields,
    );

    this.validateMeasures(
      query.measures,
      fields,
    );

    this.validateFilters(
      query.filters ?? [],
      fields,
    );
  }

  private validateDimensions(
    dimensions: string[],
    fields: Map<string, FieldType>,
  ): void {
    for (const dimension of dimensions) {
      if (!fields.has(dimension)) {
        throw new QueryValidationError(
          `Unknown dimension field: ${dimension}`,
        );
      }
    }
  }

  private validateMeasures(
    measures: AnalyticsMeasure[],
    fields: Map<string, FieldType>,
  ): void {
    for (const measure of measures) {
      const fieldType = fields.get(measure.field);

      if (!fieldType) {
        throw new QueryValidationError(
          `Unknown measure field: ${measure.field}`,
        );
      }

      this.validateAggregation(
        measure.aggregation,
        measure.field,
        fieldType,
      );
    }
  }

  private validateAggregation(
    aggregation: Aggregation,
    field: string,
    fieldType: FieldType,
  ): void {
    if (aggregation === 'count') {
      return;
    }

    const numericAggregations: Aggregation[] = [
      'sum',
      'avg',
      'min',
      'max',
    ];

    if (
      numericAggregations.includes(aggregation) &&
      fieldType !== 'number'
    ) {
      throw new QueryValidationError(
        `Aggregation '${aggregation}' requires a numeric field. ` +
          `Field '${field}' is '${fieldType}'.`,
      );
    }
  }

  private validateFilters(
    filters: AnalyticsFilter[],
    fields: Map<string, FieldType>,
  ): void {
    for (const filter of filters) {
      const fieldType = fields.get(filter.field);

      if (!fieldType) {
        throw new QueryValidationError(
          `Unknown filter field: ${filter.field}`,
        );
      }

      if (
        ['gt', 'gte', 'lt', 'lte'].includes(
          filter.operator,
        ) &&
        fieldType !== 'number'
      ) {
        throw new QueryValidationError(
          `Operator '${filter.operator}' requires a numeric field. ` +
            `Field '${filter.field}' is '${fieldType}'.`,
        );
      }
    }
  }
}
