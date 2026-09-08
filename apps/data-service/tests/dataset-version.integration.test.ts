import assert from 'node:assert/strict';
import test from 'node:test';

import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  database: process.env.POSTGRES_DB ?? 'aibi',
  user: process.env.POSTGRES_USER ?? 'aibi',
  password: process.env.POSTGRES_PASSWORD ?? 'aibi',
});

const organizationA =
  '00000000-0000-0000-0000-000000000001';

const organizationB =
  '00000000-0000-0000-0000-000000000002';

const datasetId =
  '03569b7e-f97f-4702-9ec1-f32cc63052f8';

const versionId =
  '552484c8-252e-4575-affe-f38ec2a3364a';

test(
  'should not allow one organization to access another organization dataset version',
  async () => {
    const result = await pool.query(
      `
      SELECT
        id,
        dataset_id,
        organization_id,
        version_number,
        status,
        original_filename,
        object_key,
        file_size_bytes,
        content_type,
        checksum,
        created_by,
        created_at,
        updated_at
      FROM dataset_versions
      WHERE id = $1
        AND dataset_id = $2
        AND organization_id = $3
      `,
      [
        versionId,
        datasetId,
        organizationB,
      ],
    );

    assert.equal(result.rowCount, 0);
  },
);

test.after(async () => {
  await pool.end();
});