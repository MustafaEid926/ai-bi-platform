import { z } from 'zod';

const MAX_DIMENSIONS = 10;
const MAX_MEASURES = 10;
const MAX_FILTERS = 20;

const aggregationSchema = z.enum([
  'sum',
  'count',
  'avg',
  'min',
  'max',
]);

const filterOperatorSchema = z.enum([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
]);

const measureSchema = z.object({
  field: z.string().min(1),
  aggregation: aggregationSchema,
  alias: z.string().min(1).optional(),
});

const filterSchema = z.object({
  field: z.string().min(1),
  operator: filterOperatorSchema,
  value: z.unknown(),
});

export const analyticsQuerySchema = z.object({
  datasetId: z.string().min(1),
  versionId: z.string().min(1),

  dimensions: z
    .array(z.string().min(1))
    .max(MAX_DIMENSIONS)
    .default([]),

  measures: z
    .array(measureSchema)
    .min(1)
    .max(MAX_MEASURES),

  filters: z
    .array(filterSchema)
    .max(MAX_FILTERS)
    .default([]),
});

export type AnalyticsQueryInput = z.infer<
  typeof analyticsQuerySchema
>;