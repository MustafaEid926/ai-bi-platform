import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { app } from '../../src/app.js';

function startTestServer(): Promise<{
  server: http.Server;
  url: string;
}> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();

      if (
        !address ||
        typeof address === 'string'
      ) {
        throw new Error(
          'Failed to resolve test server address',
        );
      }

      resolve({
        server,
        url: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

function stopTestServer(
  server: http.Server,
): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

test(
  'should return 400 for invalid analytics query body',
  async () => {
    const { server, url } =
      await startTestServer();

    try {
      const response = await fetch(
        `${url}/api/v1/analytics/query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Organization-ID':
              '00000000-0000-0000-0000-000000000001',
          },
          body: JSON.stringify({
            datasetId: '',
            versionId: '',
            dimensions: [],
            measures: [],
          }),
        },
      );

      assert.equal(response.status, 400);

      const body =
        (await response.json()) as {
          error: {
            code: string;
            message: string;
            details?: unknown;
          };
        };

      assert.equal(
        body.error.code,
        'VALIDATION_ERROR',
      );

      assert.equal(
        body.error.message,
        'Request validation failed',
      );

      assert.ok(
        Array.isArray(body.error.details),
      );
    } finally {
      await stopTestServer(server);
    }
  },
);

test(
  'should return 400 when organization id is missing',
  async () => {
    const { server, url } =
      await startTestServer();

    try {
      const response = await fetch(
        `${url}/api/v1/analytics/query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            datasetId:
              '03569b7e-f97f-4702-9ec1-f32cc63052f8',
            versionId:
              '552484c8-252e-4575-affe-f38ec2a3364a',
            dimensions: ['category'],
            measures: [
              {
                field: 'revenue',
                aggregation: 'sum',
              },
            ],
            filters: [],
          }),
        },
      );

      assert.equal(response.status, 400);

      const body =
        (await response.json()) as {
          error: {
            code: string;
            message: string;
          };
        };

      assert.equal(
        body.error.code,
        'ORGANIZATION_ID_REQUIRED',
      );

      assert.equal(
        body.error.message,
        'X-Organization-ID header is required',
      );
    } finally {
      await stopTestServer(server);
    }
  },
);