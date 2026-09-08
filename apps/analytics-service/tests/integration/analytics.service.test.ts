import test from 'node:test';
import assert from 'node:assert/strict';

import { AppError } from '@aibi/errors';

import { AnalyticsService } from '../../src/services/analytics.service.js';
import { DatasetVersionService } from '../../src/services/dataset-version.service.js';
import type { DatasetVersion } from '../../src/clients/data-service.client.js';

import { CsvParser } from '../../src/parsers/csv.parser.js';
import { MinioReader } from '../../src/storage/minio.reader.js';
import { FilterEngine } from '../../src/engine/filter.engine.js';
import { QueryEngine } from '../../src/engine/query.engine.js';
import { AggregationEngine } from '../../src/engine/aggregation.engine.js';
import { SchemaInference } from '../../src/engine/schema.inference.js';
import { QueryValidator } from '../../src/engine/query.validator.js';

import type { AnalyticsQuery } from '../../src/types/analytics.types.js';

interface TestDataServiceClient {
  getDatasetVersion(
    datasetId: string,
    versionId: string,
    organizationId: string,
  ): Promise<DatasetVersion>;
}

const datasetId =
  '03569b7e-f97f-4702-9ec1-f32cc63052f8';

const versionId =
  '552484c8-252e-4575-affe-f38ec2a3364a';

const organizationId =
  '00000000-0000-0000-0000-000000000001';

const csvContent = `
product,category,revenue,quantity
Laptop,Electronics,125000,25
Phone,Electronics,98000,40
Tablet,Electronics,72000,30
Monitor,Electronics,55000,20
Keyboard,Accessories,18000,60
Mouse,Accessories,12000,80
`.trim();

class FakeDataServiceClient
  implements TestDataServiceClient
{
  async getDatasetVersion(
    requestedDatasetId: string,
    requestedVersionId: string,
    requestedOrganizationId: string,
  ): Promise<DatasetVersion> {
    assert.equal(
      requestedDatasetId,
      datasetId,
    );

    assert.equal(
      requestedVersionId,
      versionId,
    );

    assert.equal(
      requestedOrganizationId,
      organizationId,
    );

    return {
      id: versionId,
      dataset_id: datasetId,
      organization_id: organizationId,
      version_number: 2,
      status: 'UPLOADED',
      original_filename: 'analytics-demo.csv',
      object_key:
        'organizations/test/datasets/test/versions/v2/analytics-demo.csv',
      file_size_bytes: csvContent.length,
      content_type: 'text/csv',
      checksum: 'test-checksum',
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

class FakeMinioReader {
  async readObject(
    objectKey: string,
  ): Promise<Buffer> {
    assert.equal(
      objectKey,
      'organizations/test/datasets/test/versions/v2/analytics-demo.csv',
    );

    return Buffer.from(
      csvContent,
      'utf-8',
    );
  }
}

function createAnalyticsService(
  dataServiceClient: TestDataServiceClient =
    new FakeDataServiceClient(),
  minioReader: FakeMinioReader =
    new FakeMinioReader(),
) {
  const datasetVersionService =
    new DatasetVersionService(
      dataServiceClient as never,
    );

  const csvParser = new CsvParser();
  const filterEngine = new FilterEngine();
  const aggregationEngine =
    new AggregationEngine();

  const queryEngine =
    new QueryEngine(aggregationEngine);

  const schemaInference =
    new SchemaInference();

  const queryValidator =
    new QueryValidator();

  return new AnalyticsService(
    datasetVersionService,
    minioReader as MinioReader,
    csvParser,
    filterEngine,
    queryEngine,
    schemaInference,
    queryValidator,
  );
}

test(
  'should execute an end-to-end analytics query',
  async () => {
    const service =
      createAnalyticsService();

    const query: AnalyticsQuery = {
      datasetId,
      versionId,
      dimensions: ['category'],
      measures: [
        {
          field: 'revenue',
          aggregation: 'sum',
          alias: 'total_revenue',
        },
      ],
      filters: [],
    };

    const result =
      await service.executeQuery(
        query,
        organizationId,
      );

    assert.ok(result.queryId);

    assert.equal(
      result.definition.datasetId,
      datasetId,
    );

    assert.equal(
      result.definition.versionId,
      versionId,
    );

    assert.deepEqual(
      result.columns,
      [
        'category',
        'total_revenue',
      ],
    );

    assert.deepEqual(
      result.rows,
      [
        ['Electronics', 350000],
        ['Accessories', 30000],
      ],
    );

    assert.ok(
      result.executionTimeMs >= 0,
    );
  },
);

test(
  'should execute a filtered analytics query',
  async () => {
    const service =
      createAnalyticsService();

    const query: AnalyticsQuery = {
      datasetId,
      versionId,
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
      ],
      filters: [
        {
          field: 'revenue',
          operator: 'gte',
          value: 50000,
        },
      ],
    };

    const result =
      await service.executeQuery(
        query,
        organizationId,
      );

    assert.deepEqual(
      result.columns,
      [
        'category',
        'total_revenue',
        'total_quantity',
      ],
    );

    assert.deepEqual(
      result.rows,
      [
        ['Electronics', 350000, 115],
      ],
    );
  },
);

test(
  'should execute a KPI query without dimensions',
  async () => {
    const service =
      createAnalyticsService();

    const query: AnalyticsQuery = {
      datasetId,
      versionId,
      dimensions: [],
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
      filters: [],
    };

    const result =
      await service.executeQuery(
        query,
        organizationId,
      );

    assert.deepEqual(
      result.columns,
      [
        'total_revenue',
        'total_quantity',
        'average_revenue',
      ],
    );

    assert.deepEqual(
      result.rows,
      [
        [
          380000,
          255,
          63333.333333333336,
        ],
      ],
    );
  },
);

test(
  'should reject an invalid measure field',
  async () => {
    const service =
      createAnalyticsService();

    const query: AnalyticsQuery = {
      datasetId,
      versionId,
      dimensions: ['category'],
      measures: [
        {
          field: 'unknown_field',
          aggregation: 'sum',
        },
      ],
      filters: [],
    };

    await assert.rejects(
      () =>
        service.executeQuery(
          query,
          organizationId,
        ),
      {
        name: 'QueryValidationError',
        message:
          'Unknown measure field: unknown_field',
      },
    );
  },
);

test(
  'should reject a non-numeric aggregation',
  async () => {
    const service =
      createAnalyticsService();

    const query: AnalyticsQuery = {
      datasetId,
      versionId,
      dimensions: [],
      measures: [
        {
          field: 'product',
          aggregation: 'sum',
        },
      ],
      filters: [],
    };

    await assert.rejects(
      () =>
        service.executeQuery(
          query,
          organizationId,
        ),
      {
        name: 'QueryValidationError',
        message:
          "Aggregation 'sum' requires a numeric field. " +
          "Field 'product' is 'string'.",
      },
    );
  },
);

test(
  'should reject a dataset version that is not uploaded',
  async () => {
    class NotReadyDataServiceClient
      implements TestDataServiceClient
    {
      async getDatasetVersion(): Promise<DatasetVersion> {
        return {
          id: versionId,
          dataset_id: datasetId,
          organization_id: organizationId,
          version_number: 2,
          status: 'PROCESSING',
          original_filename:
            'analytics-demo.csv',
          object_key:
            'organizations/test/datasets/test/versions/v2/analytics-demo.csv',
          file_size_bytes:
            csvContent.length,
          content_type: 'text/csv',
          checksum: 'test-checksum',
          created_by: null,
          created_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
        };
      }
    }

    const service =
      createAnalyticsService(
        new NotReadyDataServiceClient(),
      );

    const query: AnalyticsQuery = {
      datasetId,
      versionId,
      dimensions: ['category'],
      measures: [
        {
          field: 'revenue',
          aggregation: 'sum',
        },
      ],
      filters: [],
    };

    await assert.rejects(
      () =>
        service.executeQuery(
          query,
          organizationId,
        ),
      {
        message:
          `Dataset version ${versionId} is not ready for analytics`,
      },
    );
  },
);

test(
  'should reject a dataset version without an object key',
  async () => {
    class MissingObjectKeyDataServiceClient
      implements TestDataServiceClient
    {
      async getDatasetVersion(): Promise<DatasetVersion> {
        return {
          id: versionId,
          dataset_id: datasetId,
          organization_id: organizationId,
          version_number: 2,
          status: 'UPLOADED',
          original_filename:
            'analytics-demo.csv',
          object_key: '',
          file_size_bytes:
            csvContent.length,
          content_type: 'text/csv',
          checksum: 'test-checksum',
          created_by: null,
          created_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
        };
      }
    }

    const service =
      createAnalyticsService(
        new MissingObjectKeyDataServiceClient(),
      );

    const query: AnalyticsQuery = {
      datasetId,
      versionId,
      dimensions: ['category'],
      measures: [
        {
          field: 'revenue',
          aggregation: 'sum',
        },
      ],
      filters: [],
    };

    await assert.rejects(
      () =>
        service.executeQuery(
          query,
          organizationId,
        ),
      {
        message:
          `Dataset version ${versionId} has no object key`,
      },
    );
  },
);

test(
  'should reject access to a dataset version from another organization',
  async () => {
    class CrossOrganizationDataServiceClient
      implements TestDataServiceClient
    {
      async getDatasetVersion(
        _datasetId: string,
        _versionId: string,
        requestedOrganizationId: string,
      ): Promise<DatasetVersion> {
        assert.equal(
          requestedOrganizationId,
          'organization-b',
        );

        throw new AppError(
          'DATASET_VERSION_NOT_FOUND',
          404,
          'Dataset version not found',
        );
      }
    }

    const service =
      createAnalyticsService(
        new CrossOrganizationDataServiceClient(),
      );

    const query: AnalyticsQuery = {
      datasetId,
      versionId,
      dimensions: ['category'],
      measures: [
        {
          field: 'revenue',
          aggregation: 'sum',
        },
      ],
      filters: [],
    };

    await assert.rejects(
      () =>
        service.executeQuery(
          query,
          'organization-b',
        ),
      {
        name: 'AppError',
        code: 'DATASET_VERSION_NOT_FOUND',
        status: 404,
        message: 'Dataset version not found',
      },
    );
  },
);