import test from 'node:test';
import assert from 'node:assert/strict';

import { AggregationEngine } from '../../src/engine/aggregation.engine.js';
import { QueryEngine } from '../../src/engine/query.engine.js';

const aggregationEngine = new AggregationEngine();
const engine = new QueryEngine(aggregationEngine);

const rows = [
    {
        product: 'Laptop',
        category: 'Electronics',
        region: 'Cairo',
        revenue: 125000,
        quantity: 25,
    },
    {
        product: 'Phone',
        category: 'Electronics',
        region: 'Cairo',
        revenue: 98000,
        quantity: 40,
    },
    {
        product: 'Tablet',
        category: 'Electronics',
        region: 'Alexandria',
        revenue: 72000,
        quantity: 30,
    },
    {
        product: 'Keyboard',
        category: 'Accessories',
        region: 'Cairo',
        revenue: 18000,
        quantity: 60,
    },
    {
        product: 'Mouse',
        category: 'Accessories',
        region: 'Alexandria',
        revenue: 12000,
        quantity: 80,
    },
];

test('should calculate a single aggregate when there are no dimensions', () => {
    const result = engine.execute(rows, {
        dimensions: [],
        measures: [
            {
                field: 'revenue',
                aggregation: 'sum',
                alias: 'total_revenue',
            },
        ],
    });

    assert.deepEqual(result, [
        {
            total_revenue: 325000,
        },
    ]);
});

test('should group by a single dimension', () => {
    const result = engine.execute(rows, {
        dimensions: ['category'],
        measures: [
            {
                field: 'revenue',
                aggregation: 'sum',
                alias: 'total_revenue',
            },
        ],
    });

    assert.deepEqual(result, [
        {
            category: 'Electronics',
            total_revenue: 295000,
        },
        {
            category: 'Accessories',
            total_revenue: 30000,
        },
    ]);
});

test('should group by multiple dimensions', () => {
    const result = engine.execute(rows, {
        dimensions: ['category', 'region'],
        measures: [
            {
                field: 'revenue',
                aggregation: 'sum',
                alias: 'total_revenue',
            },
        ],
    });

    assert.deepEqual(result, [
        {
            category: 'Electronics',
            region: 'Cairo',
            total_revenue: 223000,
        },
        {
            category: 'Electronics',
            region: 'Alexandria',
            total_revenue: 72000,
        },
        {
            category: 'Accessories',
            region: 'Cairo',
            total_revenue: 18000,
        },
        {
            category: 'Accessories',
            region: 'Alexandria',
            total_revenue: 12000,
        },
    ]);
});

test('should support multiple measures', () => {
    const result = engine.execute(rows, {
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
    });

    assert.deepEqual(result, [
        {
            category: 'Electronics',
            total_revenue: 295000,
            total_quantity: 95,
            average_revenue: 98333.33333333333,
        },
        {
            category: 'Accessories',
            total_revenue: 30000,
            total_quantity: 140,
            average_revenue: 15000,
        },
    ]);
});

test('should generate a default alias when alias is not provided', () => {
    const result = engine.execute(rows, {
        dimensions: ['category'],
        measures: [
            {
                field: 'revenue',
                aggregation: 'sum',
            },
        ],
    });

    assert.deepEqual(result, [
        {
            category: 'Electronics',
            sum_revenue: 295000,
        },
        {
            category: 'Accessories',
            sum_revenue: 30000,
        },
    ]);
});

test('should support count aggregation', () => {
    const result = engine.execute(rows, {
        dimensions: ['category'],
        measures: [
            {
                field: 'product',
                aggregation: 'count',
                alias: 'product_count',
            },
        ],
    });

    assert.deepEqual(result, [
        {
            category: 'Electronics',
            product_count: 3,
        },
        {
            category: 'Accessories',
            product_count: 2,
        },
    ]);
});

test('should return an empty array for an empty dataset with dimensions', () => {
    const result = engine.execute([], {
        dimensions: ['category'],
        measures: [
            {
                field: 'revenue',
                aggregation: 'sum',
                alias: 'total_revenue',
            },
        ],
    });

    assert.deepEqual(result, []);
});

test('should return one aggregate row for an empty dataset without dimensions', () => {
    const result = engine.execute([], {
        dimensions: [],
        measures: [
            {
                field: 'revenue',
                aggregation: 'sum',
                alias: 'total_revenue',
            },
        ],
    });

    assert.deepEqual(result, [
        {
            total_revenue: 0,
        },
    ]);
});

test('should preserve dimension values for each group', () => {
    const result = engine.execute(rows, {
        dimensions: ['region'],
        measures: [
            {
                field: 'quantity',
                aggregation: 'sum',
                alias: 'total_quantity',
            },
        ],
    });

    assert.deepEqual(result, [
        {
            region: 'Cairo',
            total_quantity: 125,
        },
        {
            region: 'Alexandria',
            total_quantity: 110,
        },
    ]);
});

test('should keep groups independent from each other', () => {
    const result = engine.execute(rows, {
        dimensions: ['category', 'region'],
        measures: [
            {
                field: 'quantity',
                aggregation: 'sum',
                alias: 'total_quantity',
            },
        ],
    });

    assert.deepEqual(result, [
        {
            category: 'Electronics',
            region: 'Cairo',
            total_quantity: 65,
        },
        {
            category: 'Electronics',
            region: 'Alexandria',
            total_quantity: 30,
        },
        {
            category: 'Accessories',
            region: 'Cairo',
            total_quantity: 60,
        },
        {
            category: 'Accessories',
            region: 'Alexandria',
            total_quantity: 80,
        },
    ]);
});