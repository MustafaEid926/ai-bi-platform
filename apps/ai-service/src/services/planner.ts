import {
  analyticsQuerySchema,
  type AnalyticsQuery,
} from '../schemas/analytics-query.schema.js';

export interface PlannerInput {
  question: string;
  datasetId: string;
  versionId: string;
}

export class AnalyticsPlanner {
  plan(input: PlannerInput): AnalyticsQuery {
    const question = input.question.toLowerCase();

    // Temporary deterministic planner.
    // This will be replaced by the LLM planner once the
    // OpenAI-compatible endpoint is available.

    let aggregation: AnalyticsQuery['measures'][number]['aggregation'] =
      'sum';

    let field = 'revenue';

    if (question.includes('average') || question.includes('avg')) {
      aggregation = 'avg';
      field = question.includes('quantity') ? 'quantity' : 'revenue';
    } else if (
      question.includes('count') ||
      question.includes('number of')
    ) {
      aggregation = 'count';
      field = 'product';
    } else if (question.includes('minimum') || question.includes('min')) {
      aggregation = 'min';
      field = question.includes('quantity') ? 'quantity' : 'revenue';
    } else if (question.includes('maximum') || question.includes('max')) {
      aggregation = 'max';
      field = question.includes('quantity') ? 'quantity' : 'revenue';
    }

    const query: AnalyticsQuery = {
      datasetId: input.datasetId,
      versionId: input.versionId,
      dimensions: ['product'],
      measures: [
        {
          field,
          aggregation,
          alias: `${aggregation}_${field}`,
        },
      ],
      filters: [],
    };

    return analyticsQuerySchema.parse(query);
  }
}