import { AggregationEngine } from './engine/aggregation.engine.js';
import { QueryEngine } from './engine/query.engine.js';

const aggregationEngine =
  new AggregationEngine();

const queryEngine =
  new QueryEngine(aggregationEngine);

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

const result = queryEngine.execute(
  rows,
  {
    dimensions: ['category'],
    measures: [
      {
        field: 'revenue',
        aggregation: 'sum',
        alias: 'total_revenue',
      },
    ],
  },
);

console.log(
  JSON.stringify(result, null, 2),
);
