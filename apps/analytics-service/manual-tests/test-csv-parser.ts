import { CsvParser } from './parsers/csv.parser.js';

const parser = new CsvParser();

const csv = Buffer.from(
  `product,category,revenue,quantity
Laptop,Electronics,125000,25
Phone,Electronics,98000,40
Tablet,Electronics,72000,30
Monitor,Electronics,55000,20
Keyboard,Accessories,18000,60
Mouse,Accessories,12000,80`,
);

const rows = parser.parse(csv);

console.log(JSON.stringify(rows, null, 2));