import { DataServiceClient } from './clients/data-service.client.js';

const client = new DataServiceClient();

const version =
  await client.getDatasetVersion(
    '03569b7e-f97f-4702-9ec1-f32cc63052f8',
    '552484c8-252e-4575-affe-f38ec2a3364a',
    '00000000-0000-0000-0000-000000000001',
  );

console.log(
  JSON.stringify(version, null, 2),
);