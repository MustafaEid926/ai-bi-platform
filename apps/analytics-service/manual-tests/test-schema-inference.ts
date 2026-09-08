import { CsvParser } from './parsers/csv.parser.js';
import { SchemaInference } from './engine/schema.inference.js';

const csv = `
product,category,revenue,quantity
Laptop,Electronics,125000,25
Phone,Electronics,98000,40
Tablet,Electronics,72000,30
Monitor,Electronics,55000,20
Keyboard,Accessories,18000,60
Mouse,Accessories,12000,80
`;

const parser = new CsvParser();
const inference = new SchemaInference();

const rows = parser.parse(
  Buffer.from(csv),
);

const schema = inference.infer(rows);

console.log(
  JSON.stringify(schema, null, 2),
);