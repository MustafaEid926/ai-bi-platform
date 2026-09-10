import { z } from 'zod';

export const aggregationSchema = z.enum([
  'sum',
  'count',
  'avg',
  'min',
  'max',
]);

export const filterOperatorSchema = z.enum([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
]);

export const analyticsMeasureSchema = z.object({
  field: z.string().min(1),
  aggregation: aggregationSchema,
  alias: z.string().min(1).optional(),
});

export const analyticsFilterSchema = z.object({
  field: z.string().min(1),
  operator: filterOperatorSchema,
  value: z.unknown(),
});

export const analyticsQuerySchema = z.object({
  datasetId: z.string().min(1),
  versionId: z.string().min(1),
  dimensions: z.array(z.string().min(1)).max(10).default([]),
  measures: z.array(analyticsMeasureSchema).min(1).max(10),
  filters: z.array(analyticsFilterSchema).max(20).default([]),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
