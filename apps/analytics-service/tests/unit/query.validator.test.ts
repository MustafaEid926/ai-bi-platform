import test from 'node:test';
import assert from 'node:assert/strict';

import {
  QueryValidationError,
  QueryValidator,
} from '../../src/engine/query.validator.js';

import type {
  AnalyticsQuery,
} from '../../src/types/analytics.types.js';

import type {
  DatasetSchema,
} from '../../src/engine/schema.inference.js';

const schema: DatasetSchema = {
  fields: [
    {
      name: 'product',
      type: 'string',
    },
    {
      name: 'category',
      type: 'string',
    },
    {
      name: 'revenue',
      type: 'number',
    },
    {
      name: 'quantity',
      type: 'number',
    },
  ],
};

const validator = new QueryValidator();

test('should accept a valid analytics query', () => {
  const query: AnalyticsQuery = {
    datasetId: 'dataset-1',
    versionId: 'version-1',
    dimensions: ['category'],
    measures: [
      {
        field: 'revenue',
        aggregation: 'sum',
      },
    ],
    filters: [],
  };

  assert.doesNotThrow(() => {
    validator.validate(query, schema);
  });
});

test('should accept count on a string field', () => {
  const query: AnalyticsQuery = {
    datasetId: 'dataset-1',
    versionId: 'version-1',
    dimensions: [],
    measures: [
      {
        field: 'product',
        aggregation: 'count',
      },
    ],
    filters: [],
  };

  assert.doesNotThrow(() => {
    validator.validate(query, schema);
  });
});

test('should reject an unknown dimension', () => {
  const query: AnalyticsQuery = {
    datasetId: 'dataset-1',
    versionId: 'version-1',
    dimensions: ['unknown_field'],
    measures: [
      {
        field: 'revenue',
        aggregation: 'sum',
      },
    ],
    filters: [],
  };

  assert.throws(
    () => validator.validate(query, schema),
    (error: unknown) => {
      assert.ok(error instanceof QueryValidationError);
      assert.equal(
        error.message,
        'Unknown dimension field: unknown_field',
      );
      return true;
    },
  );
});

test('should reject an unknown measure field', () => {
  const query: AnalyticsQuery = {
    datasetId: 'dataset-1',
    versionId: 'version-1',
    dimensions: [],
    measures: [
      {
        field: 'unknown_field',
        aggregation: 'sum',
      },
    ],
    filters: [],
  };

  assert.throws(
    () => validator.validate(query, schema),
    (error: unknown) => {
      assert.ok(error instanceof QueryValidationError);
      assert.equal(
        error.message,
        'Unknown measure field: unknown_field',
      );
      return true;
    },
  );
});

test('should reject sum on a string field', () => {
  const query: AnalyticsQuery = {
    datasetId: 'dataset-1',
    versionId: 'version-1',
    dimensions: [],
    measures: [
      {
        field: 'product',
        aggregation: 'sum',
      },
    ],
    filters: [],
  };

  assert.throws(
    () => validator.validate(query, schema),
    (error: unknown) => {
      assert.ok(error instanceof QueryValidationError);
      assert.equal(
        error.message,
        "Aggregation 'sum' requires a numeric field. Field 'product' is 'string'.",
      );
      return true;
    },
  );
});

test('should reject avg on a string field', () => {
  const query: AnalyticsQuery = {
    datasetId: 'dataset-1',
    versionId: 'version-1',
    dimensions: [],
    measures: [
      {
        field: 'category',
        aggregation: 'avg',
      },
    ],
    filters: [],
  };

  assert.throws(
    () => validator.validate(query, schema),
    (error: unknown) => {
      assert.ok(error instanceof QueryValidationError);
      return true;
    },
  );
});

test('should reject an unknown filter field', () => {
  const query: AnalyticsQuery = {
    datasetId: 'dataset-1',
    versionId: 'version-1',
    dimensions: [],
    measures: [
      {
        field: 'revenue',
        aggregation: 'sum',
      },
    ],
    filters: [
      {
        field: 'unknown_field',
        operator: 'eq',
        value: 100,
      },
    ],
  };

  assert.throws(
    () => validator.validate(query, schema),
    (error: unknown) => {
      assert.ok(error instanceof QueryValidationError);
      assert.equal(
        error.message,
        'Unknown filter field: unknown_field',
      );
      return true;
    },
  );
});

test('should reject numeric comparison on a string field', () => {
  const query: AnalyticsQuery = {
    datasetId: 'dataset-1',
    versionId: 'version-1',
    dimensions: [],
    measures: [
      {
        field: 'revenue',
        aggregation: 'sum',
      },
    ],
    filters: [
      {
        field: 'category',
        operator: 'gte',
        value: 'Electronics',
      },
    ],
  };

  assert.throws(
    () => validator.validate(query, schema),
    (error: unknown) => {
      assert.ok(error instanceof QueryValidationError);
      assert.equal(
        error.message,
        "Operator 'gte' requires a numeric field. Field 'category' is 'string'.",
      );
      return true;
    },
  );
});

test('should accept numeric comparison on a number field', () => {
  const query: AnalyticsQuery = {
    datasetId: 'dataset-1',
    versionId: 'version-1',
    dimensions: [],
    measures: [
      {
        field: 'revenue',
        aggregation: 'sum',
      },
    ],
    filters: [
      {
        field: 'revenue',
        operator: 'gte',
        value: 50000,
      },
    ],
  };

  assert.doesNotThrow(() => {
    validator.validate(query, schema);
  });
});
