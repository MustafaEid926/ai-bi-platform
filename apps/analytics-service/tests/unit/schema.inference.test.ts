import test from 'node:test';
import assert from 'node:assert/strict';

import { SchemaInference } from '../../src/engine/schema.inference.js';

test('should infer string and number fields', () => {
    const rows = [
        {
            product: 'Laptop',
            revenue: 125000,
        },
        {
            product: 'Phone',
            revenue: 98000,
        },
    ];

    const inference = new SchemaInference();

    const schema = inference.infer(rows);

    assert.deepEqual(schema, {
        fields: [
            {
                name: 'product',
                type: 'string',
            },
            {
                name: 'revenue',
                type: 'number',
            },
        ],
    });
});

test('should ignore null values when inferring field type', () => {
    const rows = [
        {
            product: 'Laptop',
            revenue: 125000,
        },
        {
            product: 'Phone',
            revenue: null,
        },
    ];

    const inference = new SchemaInference();

    const schema = inference.infer(rows);

    assert.deepEqual(schema, {
        fields: [
            {
                name: 'product',
                type: 'string',
            },
            {
                name: 'revenue',
                type: 'number',
            },
        ],
    });
});

test('should return unknown for mixed field types', () => {
    const rows = [
        {
            revenue: 125000,
        },
        {
            revenue: '98000',
        },
    ];

    const inference = new SchemaInference();

    const schema = inference.infer(rows);

    assert.deepEqual(schema, {
        fields: [
            {
                name: 'revenue',
                type: 'unknown',
            },
        ],
    });
});

test('should return empty fields for an empty dataset', () => {
    const inference = new SchemaInference();

    const schema = inference.infer([]);

    assert.deepEqual(schema, {
        fields: [],
    });
});
