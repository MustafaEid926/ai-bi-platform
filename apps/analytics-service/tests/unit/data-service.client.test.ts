import test from 'node:test';
import assert from 'node:assert/strict';

import { DataServiceClient } from '../../src/clients/data-service.client.js';

test(
  'should map Data Service 404 to dataset version not found',
  async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          error: {
            code: 'DATASET_VERSION_NOT_FOUND',
            message: 'Dataset version not found',
          },
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

    try {
      const client = new DataServiceClient();

      await assert.rejects(
        () =>
          client.getDatasetVersion(
            'dataset-1',
            'version-1',
            'organization-2',
          ),
        {
          name: 'AppError',
          code: 'DATASET_VERSION_NOT_FOUND',
          status: 404,
          message: 'Dataset version not found',
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);