import test from 'node:test';
import assert from 'node:assert/strict';

import { FilterEngine } from '../../src/engine/filter.engine.js';

const rows = [
  {
    product: 'Laptop',
    category: 'Electronics',
    revenue: 125000,
    quantity: 25,
  },
  {
    product: 'Phone',
    category: 'Electronics',
    revenue: 98000,
    quantity: 40,
  },
  {
    product: 'Keyboard',
    category: 'Accessories',
    revenue: 18000,
    quantity: 60,
  },
  {
    product: 'Mouse',
    category: 'Accessories',
    revenue: 12000,
    quantity: 80,
  },
];

const engine = new FilterEngine();

test('should return all rows when filters are empty', () => {
  const result = engine.apply(rows, []);

  assert.deepEqual(result, rows);
});

test('should support eq operator', () => {
  const result = engine.apply(rows, [
    {
      field: 'category',
      operator: 'eq',
      value: 'Electronics',
    },
  ]);

  assert.equal(result.length, 2);

  assert.deepEqual(
    result.map((row) => row.product),
    ['Laptop', 'Phone'],
  );
});

test('should support neq operator', () => {
  const result = engine.apply(rows, [
    {
      field: 'category',
      operator: 'neq',
      value: 'Electronics',
    },
  ]);

  assert.equal(result.length, 2);

  assert.deepEqual(
    result.map((row) => row.product),
    ['Keyboard', 'Mouse'],
  );
});

test('should support gt operator', () => {
  const result = engine.apply(rows, [
    {
      field: 'revenue',
      operator: 'gt',
      value: 50000,
    },
  ]);

  assert.deepEqual(
    result.map((row) => row.product),
    ['Laptop', 'Phone'],
  );
});

test('should support gte operator', () => {
  const result = engine.apply(rows, [
    {
      field: 'revenue',
      operator: 'gte',
      value: 98000,
    },
  ]);

  assert.deepEqual(
    result.map((row) => row.product),
    ['Laptop', 'Phone'],
  );
});

test('should support lt operator', () => {
  const result = engine.apply(rows, [
    {
      field: 'revenue',
      operator: 'lt',
      value: 50000,
    },
  ]);

  assert.deepEqual(
    result.map((row) => row.product),
    ['Keyboard', 'Mouse'],
  );
});

test('should support lte operator', () => {
  const result = engine.apply(rows, [
    {
      field: 'revenue',
      operator: 'lte',
      value: 18000,
    },
  ]);

  assert.deepEqual(
    result.map((row) => row.product),
    ['Keyboard', 'Mouse'],
  );
});

test('should combine multiple filters using AND logic', () => {
  const result = engine.apply(rows, [
    {
      field: 'category',
      operator: 'eq',
      value: 'Electronics',
    },
    {
      field: 'revenue',
      operator: 'gt',
      value: 100000,
    },
  ]);

  assert.equal(result.length, 1);

  assert.equal(result[0]?.product, 'Laptop');
});

test('should return an empty array when no rows match', () => {
  const result = engine.apply(rows, [
    {
      field: 'revenue',
      operator: 'gt',
      value: 999999,
    },
  ]);

  assert.deepEqual(result, []);
});

test('should preserve original rows when filters match all rows', () => {
  const result = engine.apply(rows, [
    {
      field: 'revenue',
      operator: 'gte',
      value: 0,
    },
  ]);

  assert.deepEqual(result, rows);
});
