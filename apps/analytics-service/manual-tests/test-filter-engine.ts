import { FilterEngine } from './engine/filter.engine.js';

const engine = new FilterEngine();

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

const result = engine.apply(rows, [
  {
    field: 'revenue',
    operator: 'gte',
    value: 50000,
  },
]);

console.log(
  JSON.stringify(result, null, 2),
);
