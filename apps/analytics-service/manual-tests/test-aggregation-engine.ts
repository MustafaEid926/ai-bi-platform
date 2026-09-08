import { AggregationEngine } from './engine/aggregation.engine.js';

const engine = new AggregationEngine();

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
    product: 'Tablet',
    category: 'Electronics',
    revenue: 72000,
    quantity: 30,
  },
  {
    product: 'Monitor',
    category: 'Electronics',
    revenue: 55000,
    quantity: 20,
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

console.log(
  'SUM:',
  engine.aggregate(rows, {
    field: 'revenue',
    aggregation: 'sum',
  }),
);

console.log(
  'COUNT:',
  engine.aggregate(rows, {
    field: 'revenue',
    aggregation: 'count',
  }),
);

console.log(
  'AVG:',
  engine.aggregate(rows, {
    field: 'revenue',
    aggregation: 'avg',
  }),
);

console.log(
  'MIN:',
  engine.aggregate(rows, {
    field: 'revenue',
    aggregation: 'min',
  }),
);

console.log(
  'MAX:',
  engine.aggregate(rows, {
    field: 'revenue',
    aggregation: 'max',
  }),
);
