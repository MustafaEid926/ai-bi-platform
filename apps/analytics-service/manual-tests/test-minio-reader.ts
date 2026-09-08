import { MinioReader } from './storage/minio.reader.js';

const reader = new MinioReader();

const objectKey =
  'organizations/00000000-0000-0000-0000-000000000001/datasets/03569b7e-f97f-4702-9ec1-f32cc63052f8/versions/v2/analytics-demo.csv';

const buffer =
  await reader.readObject(objectKey);

console.log('Size:', buffer.length);
console.log('Content:');
console.log(buffer.toString('utf-8'));
