import test from 'node:test';
import assert from 'node:assert/strict';

import { AggregationEngine } from '../../src/engine/aggregation.engine.js';

const rows = [
  {
    product: 'Laptop',
    revenue: 125000,
    quantity: 25,
  },
  {
    product: 'Phone',
    revenue: 98000,
    quantity: 40,
  },
  {
    product: 'Tablet',
    revenue: 72000,
    quantity: 30,
  },
  {
    product: 'Mouse',
    revenue: 12000,
    quantity: 80,
  },
];

const engine = new AggregationEngine();

test('should calculate sum', () => {
  const result = engine.aggregate(rows, {
    field: 'revenue',
    aggregation: 'sum',
  });

  assert.equal(result, 307000);
});

test('should calculate count', () => {
  const result = engine.aggregate(rows, {
    field: 'product',
    aggregation: 'count',
  });

  assert.equal(result, 4);
});

test('should calculate average', () => {
  const result = engine.aggregate(rows, {
    field: 'revenue',
    aggregation: 'avg',
  });

  assert.equal(result, 76750);
});

test('should calculate minimum', () => {
  const result = engine.aggregate(rows, {
    field: 'revenue',
    aggregation: 'min',
  });

  assert.equal(result, 12000);
});

test('should calculate maximum', () => {
  const result = engine.aggregate(rows, {
    field: 'revenue',
    aggregation: 'max',
  });

  assert.equal(result, 125000);
});

test('should ignore non-numeric values for numeric aggregations', () => {
  const mixedRows = [
    { revenue: 100 },
    { revenue: 'invalid' },
    { revenue: 200 },
    { revenue: null },
  ];

  assert.equal(
    engine.aggregate(mixedRows, {
      field: 'revenue',
      aggregation: 'sum',
    }),
    300,
  );

  assert.equal(
    engine.aggregate(mixedRows, {
      field: 'revenue',
      aggregation: 'avg',
    }),
    150,
  );

  assert.equal(
    engine.aggregate(mixedRows, {
      field: 'revenue',
      aggregation: 'min',
    }),
    100,
  );

  assert.equal(
    engine.aggregate(mixedRows, {
      field: 'revenue',
      aggregation: 'max',
    }),
    200,
  );
});

test('should return zero for average of empty numeric values', () => {
  const rowsWithoutNumbers = [
    { revenue: 'invalid' },
    { revenue: null },
  ];

  const result = engine.aggregate(rowsWithoutNumbers, {
    field: 'revenue',
    aggregation: 'avg',
  });

  assert.equal(result, 0);
});

test('should return zero for min when there are no numeric values', () => {
  const rowsWithoutNumbers = [
    { revenue: 'invalid' },
    { revenue: null },
  ];

  const result = engine.aggregate(rowsWithoutNumbers, {
    field: 'revenue',
    aggregation: 'min',
  });

  assert.equal(result, 0);
});

test('should return zero for max when there are no numeric values', () => {
  const rowsWithoutNumbers = [
    { revenue: 'invalid' },
    { revenue: null },
  ];

  const result = engine.aggregate(rowsWithoutNumbers, {
    field: 'revenue',
    aggregation: 'max',
  });

  assert.equal(result, 0);
});

test('should count rows even when field values are missing', () => {
  const rowsWithMissingValues = [
    { product: 'Laptop' },
    { product: undefined },
    {},
  ];

  const result = engine.aggregate(rowsWithMissingValues, {
    field: 'product',
    aggregation: 'count',
  });

  assert.equal(result, 3);
});
