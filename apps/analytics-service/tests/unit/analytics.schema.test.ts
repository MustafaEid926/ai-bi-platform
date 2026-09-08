import test from 'node:test';
import assert from 'node:assert/strict';

import {
  analyticsQuerySchema,
} from '../../src/schemas/analytics.schema.js';

const baseQuery = {
  datasetId: 'dataset-1',
  versionId: 'version-1',
  dimensions: [],
  measures: [
    {
      field: 'revenue',
      aggregation: 'sum' as const,
    },
  ],
  filters: [],
};

test(
  'should accept a query within the configured limits',
  () => {
    const result =
      analyticsQuerySchema.safeParse({
        ...baseQuery,
        dimensions: Array.from(
          { length: 10 },
          (_, index) => `dimension_${index}`,
        ),
        measures: Array.from(
          { length: 10 },
          (_, index) => ({
            field: `measure_${index}`,
            aggregation: 'count',
          })),
        filters: Array.from(
          { length: 20 },
          (_, index) => ({
            field: `field_${index}`,
            operator: 'eq',
            value: 'value',
          })),
      });

    assert.equal(result.success, true);
  },
);

test(
  'should reject more than 10 dimensions',
  () => {
    const result =
      analyticsQuerySchema.safeParse({
        ...baseQuery,
        dimensions: Array.from(
          { length: 11 },
          (_, index) => `dimension_${index}`,
        ),
      });

    assert.equal(result.success, false);

    if (!result.success) {
      assert.ok(
        result.error.issues.some(
          (issue) =>
            issue.code === 'too_big',
        ),
      );
    }
  },
);

test(
  'should reject more than 10 measures',
  () => {
    const result =
      analyticsQuerySchema.safeParse({
        ...baseQuery,
        measures: Array.from(
          { length: 11 },
          (_, index) => ({
            field: `measure_${index}`,
            aggregation: 'count',
          })),
      });

    assert.equal(result.success, false);

    if (!result.success) {
      assert.ok(
        result.error.issues.some(
          (issue) =>
            issue.code === 'too_big',
        ),
      );
    }
  },
);

test(
  'should reject more than 20 filters',
  () => {
    const result =
      analyticsQuerySchema.safeParse({
        ...baseQuery,
        filters: Array.from(
          { length: 21 },
          (_, index) => ({
            field: `field_${index}`,
            operator: 'eq',
            value: 'value',
          })),
      });

    assert.equal(result.success, false);

    if (!result.success) {
      assert.ok(
        result.error.issues.some(
          (issue) =>
            issue.code === 'too_big',
        ),
      );
    }
  },
);