import { AggregationEngine } from './engine/aggregation.engine.js';
import { FilterEngine } from './engine/filter.engine.js';
import { QueryEngine } from './engine/query.engine.js';

const aggregationEngine =
  new AggregationEngine();

const filterEngine =
  new FilterEngine();

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

const filteredRows = filterEngine.apply(
  rows,
  [
    {
      field: 'revenue',
      operator: 'gte',
      value: 50000,
    },
  ],
);

const result = queryEngine.execute(
  filteredRows,
  {
    dimensions: ['category'],
    measures: [
      {
        field: 'revenue',
        aggregation: 'sum',
        alias: 'total_revenue',
      },
      {
        field: 'quantity',
        aggregation: 'sum',
        alias: 'total_quantity',
      },
      {
        field: 'revenue',
        aggregation: 'avg',
        alias: 'average_revenue',
      },
    ],
  },
);

console.log('Filtered rows:', filteredRows.length);

console.log(
  JSON.stringify(result, null, 2),
);
