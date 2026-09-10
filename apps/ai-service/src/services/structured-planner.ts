import {
  analyticsQuerySchema,
  type AnalyticsQuery,
} from '../schemas/analytics-query.schema.js';
import { LlmClient } from './llm-client.js';

export interface StructuredPlannerInput {
  question: string;
  datasetId: string;
  versionId: string;
}

export class StructuredAnalyticsPlanner {
  constructor(private readonly llmClient: LlmClient) {}

  async plan(input: StructuredPlannerInput): Promise<AnalyticsQuery> {
    const prompt = this.buildPlanningPrompt(input);

    const result = await this.llmClient.generate({
      prompt,
      max_new_tokens: 300,
    });

    const json = this.extractJson(result.answer);

    if (
        typeof json !== 'object' ||
        json === null ||
        Array.isArray(json)
    ) {
        throw new Error('LLM planner must return a JSON object');
    }

    return analyticsQuerySchema.parse({
        ...json,
        datasetId: input.datasetId,
        versionId: input.versionId,
    });
  }

  private buildPlanningPrompt(input: StructuredPlannerInput): string {
    return `You are an analytics query planner for a Business Intelligence platform.

Convert the user's question into a JSON analytics query.

User question:
${input.question}

Available dataset context:
datasetId: ${input.datasetId}
versionId: ${input.versionId}

Return ONLY valid JSON.
Do not use markdown.
Do not add explanations.

JSON schema:
{
  "dimensions": ["field_name"],
  "measures": [
    {
      "field": "field_name",
      "aggregation": "sum|count|avg|min|max",
      "alias": "optional_alias"
    }
  ],
  "filters": [
    {
      "field": "field_name",
      "operator": "eq|neq|gt|gte|lt|lte",
      "value": "value"
    }
  ]
}

Rules:
- Use dimensions when the question asks for a result broken down by a field.
- Use measures for numeric calculations or counting.
- Use filters only when the user explicitly asks to filter data.
- Do not invent fields that are not implied by the question.
- Return exactly one analytics query object.
`;
  }

  private extractJson(answer: string): unknown {
    const cleaned = answer
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');

      if (start === -1 || end === -1 || end <= start) {
        throw new Error('LLM planner did not return valid JSON');
      }

      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        throw new Error('LLM planner returned malformed JSON');
      }
    }
  }
}