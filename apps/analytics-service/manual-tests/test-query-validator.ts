import {
  QueryValidator,
  QueryValidationError,
} from './engine/query.validator.js';

import { SchemaInference } from './engine/schema.inference.js';
import { CsvParser } from './parsers/csv.parser.js';

const csv = `
product,category,revenue,quantity
Laptop,Electronics,125000,25
Phone,Electronics,98000,40
Tablet,Electronics,72000,30
`;

const parser = new CsvParser();
const inference = new SchemaInference();
const validator = new QueryValidator();

const rows = parser.parse(
  Buffer.from(csv),
);

const schema = inference.infer(rows);

console.log('Dataset Schema:');
console.log(
  JSON.stringify(schema, null, 2),
);

const validQuery = {
  datasetId: 'dataset-1',
  versionId: 'version-1',

  dimensions: ['category'],

  measures: [
    {
      field: 'revenue',
      aggregation: 'sum' as const,
      alias: 'total_revenue',
    },
  ],

  filters: [],
};

validator.validate(
  validQuery,
  schema,
);

console.log(
  '\n✅ VALID QUERY PASSED',
);

const invalidQuery = {
  ...validQuery,

  measures: [
    {
      field: 'product',
      aggregation: 'sum' as const,
    },
  ],
};

try {
  validator.validate(
    invalidQuery,
    schema,
  );

  console.log(
    '❌ INVALID QUERY SHOULD HAVE FAILED',
  );
} catch (error) {
  if (
    error instanceof QueryValidationError
  ) {
    console.log(
      '\n✅ INVALID QUERY REJECTED:',
    );

    console.log(error.message);
  } else {
    throw error;
  }
}
