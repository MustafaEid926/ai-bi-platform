import {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { z } from 'zod';

import { env } from '@aibi/config';
import { logger } from '@aibi/logger';
import { publish, connectBus } from '@aibi/messaging';
import { requestContext } from '@aibi/observability';

import { app } from './app.js';

// import {
//   S3Client,
//   PutObjectCommand,
//   HeadObjectCommand,
// } from '@aws-sdk/client-s3';

import { MinioStorage } from './storage/minio.js';

// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const port = Number(process.env.PORT ?? 3002);

const pool = new Pool({
  host: env.postgres.host,
  port: env.postgres.port,
  database: env.postgres.db,
  user: env.postgres.user,
  password: env.postgres.password,
});

// const s3 = new S3Client({
//   endpoint: `http://${env.minio.endpoint}:${env.minio.port}`,
//   region: 'us-east-1',
//   forcePathStyle: true,
//   credentials: {
//     accessKeyId: env.minio.accessKey,
//     secretAccessKey: env.minio.secretKey,
//   },
// });

const storage = new MinioStorage();

type AppRequest = Request & {
  organizationId?: string;
  userId?: string;
};

function getOrganizationId(req: Request): string {
  const organizationId = req.header('X-Organization-ID');

  if (!organizationId) {
    throw new Error('X-Organization-ID header is required');
  }

  return organizationId;
}

function getUserId(req: Request): string | undefined {
  return req.header('X-User-ID') ?? undefined;
}

function sanitizeFilename(filename: string): string {
  return (
    filename
      .replace(/\\/g, '/')
      .split('/')
      .pop()
      ?.replace(/[^a-zA-Z0-9._-]/g, '_') ?? 'file'
  );
}

/* =========================================================
   DATABASE
   ========================================================= */

async function initDatabase(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS datasets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'CREATED'
        CHECK (
          status IN (
            'CREATED',
            'UPLOADING',
            'PROCESSING',
            'READY',
            'FAILED'
          )
        ),
      created_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_datasets_organization
      ON datasets (organization_id);

    CREATE INDEX IF NOT EXISTS idx_datasets_organization_created
      ON datasets (organization_id, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS dataset_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      dataset_id UUID NOT NULL
        REFERENCES datasets(id)
        ON DELETE CASCADE,

      organization_id UUID NOT NULL,

      version_number INTEGER NOT NULL
        CHECK (version_number > 0),

      status TEXT NOT NULL DEFAULT 'UPLOADING'
        CHECK (
          status IN (
            'CREATED',
            'UPLOADING',
            'UPLOADED',
            'PROCESSING',
            'READY',
            'FAILED'
          )
        ),

      original_filename TEXT NOT NULL,

      object_key TEXT NOT NULL,

      file_size_bytes BIGINT,

      content_type TEXT,

      checksum TEXT,

      created_by UUID,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      UNIQUE(dataset_id, version_number),

      UNIQUE(object_key)
    );

    CREATE INDEX IF NOT EXISTS idx_dataset_versions_organization
      ON dataset_versions (organization_id);

    CREATE INDEX IF NOT EXISTS idx_dataset_versions_dataset
      ON dataset_versions (dataset_id, version_number DESC);

    CREATE INDEX IF NOT EXISTS idx_dataset_versions_status
      ON dataset_versions (organization_id, status);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS processing_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      dataset_version_id UUID NOT NULL
        REFERENCES dataset_versions(id)
        ON DELETE CASCADE,

      organization_id UUID NOT NULL,

      job_type TEXT NOT NULL
        CHECK (
          job_type IN (
            'VALIDATE',
            'CLEAN',
            'TRANSFORM',
            'LOAD'
          )
        ),

      status TEXT NOT NULL DEFAULT 'QUEUED'
        CHECK (
          status IN (
            'QUEUED',
            'RUNNING',
            'SUCCEEDED',
            'FAILED',
            'CANCELLED'
          )
        ),

      attempt INTEGER NOT NULL DEFAULT 0
        CHECK (attempt >= 0),

      error_message TEXT,

      started_at TIMESTAMPTZ,

      completed_at TIMESTAMPTZ,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_processing_jobs_organization
      ON processing_jobs (organization_id);

    CREATE INDEX IF NOT EXISTS idx_processing_jobs_version
      ON processing_jobs (dataset_version_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_processing_jobs_status
      ON processing_jobs (organization_id, status);
  `);

  logger.info('Data service database initialized');
}

/* =========================================================
   HEALTH
   ========================================================= */

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'data-service',
  });
});

app.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      status: 'ready',
      service: 'data-service',
      database: 'ok',
    });
  } catch {
    res.status(503).json({
      status: 'not_ready',
      service: 'data-service',
      database: 'unavailable',
    });
  }
});

/* =========================================================
   DATASETS
   ========================================================= */

const createDatasetSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
});

app.get(
  '/api/v1/datasets',
  async (req: AppRequest, res, next) => {
    try {
      const organizationId = getOrganizationId(req);

      const page = Math.max(
        Number(req.query.page ?? 1),
        1,
      );

      const limit = Math.min(
        Math.max(Number(req.query.limit ?? 20), 1),
        100,
      );

      const offset = (page - 1) * limit;

      const result = await pool.query(
        `
        SELECT
          id,
          organization_id,
          name,
          description,
          status,
          created_by,
          created_at,
          updated_at
        FROM datasets
        WHERE organization_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        `,
        [organizationId, limit, offset],
      );

      const countResult = await pool.query(
        `
        SELECT COUNT(*)::int AS total
        FROM datasets
        WHERE organization_id = $1
        `,
        [organizationId],
      );

      res.json({
        data: result.rows,
        meta: {
          page,
          limit,
          total: countResult.rows[0].total,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  '/api/v1/datasets/:id',
  async (req: AppRequest, res, next) => {
    try {
      const organizationId = getOrganizationId(req);

      const result = await pool.query(
        `
        SELECT
          id,
          organization_id,
          name,
          description,
          status,
          created_by,
          created_at,
          updated_at
        FROM datasets
        WHERE id = $1
          AND organization_id = $2
        `,
        [req.params.id, organizationId],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: {
            code: 'DATASET_NOT_FOUND',
            message: 'Dataset not found',
            request_id:
              req.header('X-Request-ID') ?? randomUUID(),
          },
        });
      }

      return res.json({
        data: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  '/api/v1/datasets',
  async (req: AppRequest, res, next) => {
    try {
      const organizationId = getOrganizationId(req);
      const userId = getUserId(req);

      const body = createDatasetSchema.parse(req.body);

      const result = await pool.query(
        `
        INSERT INTO datasets (
          organization_id,
          name,
          description,
          created_by
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [
          organizationId,
          body.name,
          body.description ?? null,
          userId ?? null,
        ],
      );

      const dataset = result.rows[0];

      try {
        await publish(
          'dataset.created',
          {
            dataset_id: dataset.id,
            name: dataset.name,
          },
          {
            producer: 'data-service',
            organization_id: organizationId,
            correlation_id:
              req.header('X-Request-ID') ?? randomUUID(),
          },
        );
      } catch (eventError) {
        logger.error(
          {
            error: eventError,
            dataset_id: dataset.id,
          },
          'Failed to publish dataset.created event',
        );
      }

      return res.status(201).json({
        data: dataset,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.delete(
  '/api/v1/datasets/:id',
  async (req: AppRequest, res, next) => {
    try {
      const organizationId = getOrganizationId(req);

      const result = await pool.query(
        `
        DELETE FROM datasets
        WHERE id = $1
          AND organization_id = $2
        RETURNING id
        `,
        [req.params.id, organizationId],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: {
            code: 'DATASET_NOT_FOUND',
            message: 'Dataset not found',
            request_id:
              req.header('X-Request-ID') ?? randomUUID(),
          },
        });
      }

      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

/* =========================================================
   DATASET VERSIONS
   ========================================================= */

const createVersionSchema = z.object({
  original_filename: z.string().trim().min(1).max(500),

  file_size_bytes: z
    .number()
    .int()
    .positive()
    .optional(),

  content_type: z
    .string()
    .trim()
    .max(200)
    .optional(),

  checksum: z
    .string()
    .trim()
    .max(256)
    .optional(),
});

/**
 * Prepare a new dataset version.
 *
 * This does NOT upload the actual file yet.
 *
 * The next MinIO phase will use object_key
 * to upload the file.
 */

app.post(
  '/api/v1/datasets/:id/versions',
  async (req: AppRequest, res, next) => {
    const client = await pool.connect();

    try {
      const organizationId = getOrganizationId(req);
      const userId = getUserId(req);

      const body = createVersionSchema.parse(req.body);

      await client.query('BEGIN');

      const datasetResult = await client.query(
        `
        SELECT
          id,
          status
        FROM datasets
        WHERE id = $1
          AND organization_id = $2
        FOR UPDATE
        `,
        [req.params.id, organizationId],
      );

      if (datasetResult.rowCount === 0) {
        await client.query('ROLLBACK');

        return res.status(404).json({
          error: {
            code: 'DATASET_NOT_FOUND',
            message: 'Dataset not found',
            request_id:
              req.header('X-Request-ID') ?? randomUUID(),
          },
        });
      }

      const versionResult = await client.query(
        `
        SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
        FROM dataset_versions
        WHERE dataset_id = $1
        `,
        [req.params.id],
      );

      const versionNumber = Number(
        versionResult.rows[0].next_version,
      );

      const safeFilename = sanitizeFilename(
        body.original_filename,
      );

      const objectKey =
        `organizations/${organizationId}` +
        `/datasets/${req.params.id}` +
        `/versions/v${versionNumber}` +
        `/${safeFilename}`;

      const insertResult = await client.query(
        `
        INSERT INTO dataset_versions (
          dataset_id,
          organization_id,
          version_number,
          status,
          original_filename,
          object_key,
          file_size_bytes,
          content_type,
          checksum,
          created_by
        )
        VALUES (
          $1,
          $2,
          $3,
          'UPLOADING',
          $4,
          $5,
          $6,
          $7,
          $8,
          $9
        )
        RETURNING *
        `,
        [
          req.params.id,
          organizationId,
          versionNumber,
          body.original_filename,
          objectKey,
          body.file_size_bytes ?? null,
          body.content_type ?? null,
          body.checksum ?? null,
          userId ?? null,
        ],
      );

      await client.query(
        `
        UPDATE datasets
        SET
          status = 'UPLOADING',
          updated_at = NOW()
        WHERE id = $1
          AND organization_id = $2
        `,
        [req.params.id, organizationId],
      );

      await client.query('COMMIT');

      const version = insertResult.rows[0];

      try {
        await publish(
          'dataset.version.created',
          {
            dataset_id: req.params.id,
            dataset_version_id: version.id,
            version_number: version.version_number,
            object_key: version.object_key,
          },
          {
            producer: 'data-service',
            organization_id: organizationId,
            correlation_id:
              req.header('X-Request-ID') ?? randomUUID(),
          },
        );
      } catch (eventError) {
        logger.error(
          {
            error: eventError,
            dataset_version_id: version.id,
          },
          'Failed to publish dataset.version.created event',
        );
      }

      return res.status(201).json({
        data: version,
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      next(error);
    } finally {
      client.release();
    }
  },
);

/* =========================================================
   LIST VERSIONS
   ========================================================= */

app.get(
  '/api/v1/datasets/:id/versions',
  async (req: AppRequest, res, next) => {
    try {
      const organizationId = getOrganizationId(req);

      const datasetResult = await pool.query(
        `
        SELECT id
        FROM datasets
        WHERE id = $1
          AND organization_id = $2
        `,
        [req.params.id, organizationId],
      );

      if (datasetResult.rowCount === 0) {
        return res.status(404).json({
          error: {
            code: 'DATASET_NOT_FOUND',
            message: 'Dataset not found',
            request_id:
              req.header('X-Request-ID') ?? randomUUID(),
          },
        });
      }

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
        WHERE dataset_id = $1
          AND organization_id = $2
        ORDER BY version_number DESC
        `,
        [req.params.id, organizationId],
      );

      return res.json({
        data: result.rows,
      });
    } catch (error) {
      next(error);
    }
  },
);

/* =========================================================
   GET VERSION
   ========================================================= */

app.get(
  '/api/v1/datasets/:id/versions/:versionId',
  async (req: AppRequest, res, next) => {
    try {
      const organizationId = getOrganizationId(req);

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
          req.params.versionId,
          req.params.id,
          organizationId,
        ],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: {
            code: 'DATASET_VERSION_NOT_FOUND',
            message: 'Dataset version not found',
            request_id:
              req.header('X-Request-ID') ?? randomUUID(),
          },
        });
      }

      return res.json({
        data: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  },
);

/* =========================================================
   CREATE UPLOAD URL
   ========================================================= */

const uploadUrlSchema = z.object({
  content_type: z
    .string()
    .trim()
    .max(200)
    .optional(),
});

app.post(
  '/api/v1/datasets/:id/versions/:versionId/upload-url',
  async (req: AppRequest, res, next) => {
    try {
      const organizationId = getOrganizationId(req);

      const body = uploadUrlSchema.parse(req.body);

      const result = await pool.query(
        `
        SELECT
          id,
          dataset_id,
          version_number,
          status,
          original_filename,
          object_key,
          content_type
        FROM dataset_versions
        WHERE id = $1
          AND dataset_id = $2
          AND organization_id = $3
        `,
        [
          req.params.versionId,
          req.params.id,
          organizationId,
        ],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: {
            code: 'DATASET_VERSION_NOT_FOUND',
            message: 'Dataset version not found',
            request_id:
              req.header('X-Request-ID') ?? randomUUID(),
          },
        });
      }

      const version = result.rows[0];

      if (
        version.status !== 'UPLOADING' &&
        version.status !== 'CREATED'
      ) {
        return res.status(409).json({
          error: {
            code: 'INVALID_VERSION_STATE',
            message:
              `Upload URL cannot be created from state ${version.status}`,
            request_id:
              req.header('X-Request-ID') ?? randomUUID(),
          },
        });
      }

      const contentType =
        body.content_type ??
        version.content_type ??
        'application/octet-stream';

      const uploadUrl = await storage.createUploadUrl(
        version.object_key,
        contentType,
      );

      return res.json({
        data: {
          upload_url: uploadUrl,
          object_key: version.object_key,
          method: 'PUT',
          content_type: contentType,
          expires_in: 900,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/* =========================================================
   COMPLETE UPLOAD
   ========================================================= */

/**
 * Temporary upload completion endpoint.
 *
 * Currently it only changes the database state.
 *
 * Later:
 *
 * Client
 *   ↓
 * MinIO upload
 *   ↓
 * verify object exists
 *   ↓
 * this endpoint
 */


app.post(
  '/api/v1/datasets/:id/versions/:versionId/complete',
  async (req: AppRequest, res, next) => {
    const client = await pool.connect();

    try {
      const organizationId = getOrganizationId(req);

      await client.query('BEGIN');

      const versionResult = await client.query(
        `
        SELECT
          id,
          dataset_id,
          version_number,
          status,
          object_key,
          original_filename,
          content_type
        FROM dataset_versions
        WHERE id = $1
          AND dataset_id = $2
          AND organization_id = $3
        FOR UPDATE
        `,
        [
          req.params.versionId,
          req.params.id,
          organizationId,
        ],
      );

      if (versionResult.rowCount === 0) {
        await client.query('ROLLBACK');

        return res.status(404).json({
          error: {
            code: 'DATASET_VERSION_NOT_FOUND',
            message: 'Dataset version not found',
            request_id:
              req.header('X-Request-ID') ?? randomUUID(),
          },
        });
      }

      const version = versionResult.rows[0];

      if (
        version.status !== 'UPLOADING' &&
        version.status !== 'CREATED'
      ) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          error: {
            code: 'INVALID_VERSION_STATE',
            message:
              `Version cannot be completed from state ${version.status}`,
            request_id:
              req.header('X-Request-ID') ?? randomUUID(),
          },
        });
      }

      let object;

      try {
        object = await storage.headObject(
          version.object_key,
        );

        logger.info(
          {
            dataset_version_id: version.id,
            object_key: version.object_key,
            content_length: object.ContentLength,
            content_type: object.ContentType,
            etag: object.ETag,
          },
          'Uploaded object verified',
        );
      } catch (error) {
        await client.query('ROLLBACK');

        logger.warn(
          {
            error,
            dataset_version_id: version.id,
            object_key: version.object_key,
          },
          'Failed to verify uploaded object in MinIO',
        );

        return res.status(409).json({
          error: {
            code: 'OBJECT_NOT_FOUND',
            message:
              'Uploaded file was not found in object storage',
            request_id:
              req.header('X-Request-ID') ?? randomUUID(),
          },
        });
      }

      const updatedVersionResult = await client.query(
        `
        UPDATE dataset_versions
        SET
          status = 'UPLOADED',
          file_size_bytes = $3,
          content_type = COALESCE($4, content_type),
          checksum = $5,
          updated_at = NOW()
        WHERE id = $1
          AND organization_id = $2
        RETURNING *
        `,
        [
          req.params.versionId,
          organizationId,
          object.ContentLength ?? null,
          object.ContentType ?? null,
          object.ETag?.replace(/"/g, '') ?? null,
        ],
      );

      await client.query(
        `
        UPDATE datasets
        SET
          status = 'CREATED',
          updated_at = NOW()
        WHERE id = $1
          AND organization_id = $2
        `,
        [
          req.params.id,
          organizationId,
        ],
      );

      await client.query('COMMIT');

      const updatedVersion =
        updatedVersionResult.rows[0];

      try {
        await publish(
          'dataset.version.uploaded',
          {
            dataset_id: req.params.id,
            dataset_version_id: updatedVersion.id,
            version_number:
              updatedVersion.version_number,
            object_key:
              updatedVersion.object_key,
          },
          {
            producer: 'data-service',
            organization_id: organizationId,
            correlation_id:
              req.header('X-Request-ID') ?? randomUUID(),
          },
        );
      } catch (eventError) {
        logger.error(
          {
            error: eventError,
            dataset_version_id: updatedVersion.id,
          },
          'Failed to publish dataset.version.uploaded event',
        );
      }

      return res.json({
        data: updatedVersion,
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      next(error);
    } finally {
      client.release();
    }
  },
);


/* =========================================================
   PROCESSING JOB
   ========================================================= */

app.post(
  '/api/v1/datasets/:id/versions/:versionId/process',
  async (req: AppRequest, res, next) => {
    const client = await pool.connect();

    try {
      const organizationId = getOrganizationId(req);

      await client.query('BEGIN');

      const versionResult = await client.query(
        `
        SELECT
          id,
          dataset_id,
          version_number,
          status
        FROM dataset_versions
        WHERE id = $1
          AND dataset_id = $2
          AND organization_id = $3
        FOR UPDATE
        `,
        [
          req.params.versionId,
          req.params.id,
          organizationId,
        ],
      );

      if (versionResult.rowCount === 0) {
        await client.query('ROLLBACK');

        return res.status(404).json({
          error: {
            code: 'DATASET_VERSION_NOT_FOUND',
            message: 'Dataset version not found',
            request_id:
              req.header('X-Request-ID') ?? randomUUID(),
          },
        });
      }

      const version = versionResult.rows[0];

      if (version.status !== 'UPLOADED') {
        await client.query('ROLLBACK');

        return res.status(409).json({
          error: {
            code: 'VERSION_NOT_READY_FOR_PROCESSING',
            message:
              `Version must be UPLOADED before processing. Current state: ${version.status}`,
            request_id:
              req.header('X-Request-ID') ?? randomUUID(),
          },
        });
      }

      const activeJobResult = await client.query(
        `
        SELECT
          id,
          job_type,
          status
        FROM processing_jobs
        WHERE dataset_version_id = $1
          AND organization_id = $2
          AND status IN ('QUEUED', 'RUNNING')
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [
          req.params.versionId,
          organizationId,
        ],
      );

      if ((activeJobResult.rowCount ?? 0) > 0) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          error: {
            code: 'PROCESSING_ALREADY_ACTIVE',
            message:
              'A processing job is already active for this dataset version',
            request_id:
              req.header('X-Request-ID') ?? randomUUID(),
          },
          data: activeJobResult.rows[0],
        });
      }

      const jobResult = await client.query(
        `
        INSERT INTO processing_jobs (
          dataset_version_id,
          organization_id,
          job_type,
          status,
          attempt
        )
        VALUES (
          $1,
          $2,
          'VALIDATE',
          'QUEUED',
          0
        )
        RETURNING *
        `,
        [
          req.params.versionId,
          organizationId,
        ],
      );

      await client.query(
        `
        UPDATE dataset_versions
        SET
          status = 'PROCESSING',
          updated_at = NOW()
        WHERE id = $1
          AND organization_id = $2
        `,
        [
          req.params.versionId,
          organizationId,
        ],
      );

      await client.query(
        `
        UPDATE datasets
        SET
          status = 'PROCESSING',
          updated_at = NOW()
        WHERE id = $1
          AND organization_id = $2
        `,
        [
          req.params.id,
          organizationId,
        ],
      );

      await client.query('COMMIT');

      const job = jobResult.rows[0];

      try {
        await publish(
          'dataset.processing.requested',
          {
            job_id: job.id,
            dataset_id: req.params.id,
            dataset_version_id:
              req.params.versionId,
            job_type: job.job_type,
          },
          {
            producer: 'data-service',
            organization_id: organizationId,
            correlation_id:
              req.header('X-Request-ID') ?? randomUUID(),
          },
        );
      } catch (eventError) {
        logger.error(
          {
            error: eventError,
            job_id: job.id,
          },
          'Failed to publish processing request event',
        );
      }

      return res.status(202).json({
        data: job,
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      next(error);
    } finally {
      client.release();
    }
  },
);

/* =========================================================
   GET PROCESSING JOB
   ========================================================= */

app.get(
  '/api/v1/processing-jobs/:jobId',
  async (req: AppRequest, res, next) => {
    try {
      const organizationId = getOrganizationId(req);

      const result = await pool.query(
        `
        SELECT
          id,
          dataset_version_id,
          organization_id,
          job_type,
          status,
          attempt,
          error_message,
          started_at,
          completed_at,
          created_at
        FROM processing_jobs
        WHERE id = $1
          AND organization_id = $2
        `,
        [
          req.params.jobId,
          organizationId,
        ],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: {
            code: 'PROCESSING_JOB_NOT_FOUND',
            message: 'Processing job not found',
            request_id:
              req.header('X-Request-ID') ?? randomUUID(),
          },
        });
      }

      return res.json({
        data: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  },
);

/* =========================================================
   ERROR HANDLER
   ========================================================= */

app.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const requestId = randomUUID();

    logger.error(
      {
        error,
        request_id: requestId,
      },
      'Unhandled data-service error',
    );

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: error.flatten(),
          request_id: requestId,
        },
      });
    }

    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        request_id: requestId,
      },
    });
  },
);

/* =========================================================
   START
   ========================================================= */

async function start(): Promise<void> {
  await initDatabase();

  try {
    await connectBus();

    logger.info('RabbitMQ connected');
  } catch (error) {
    logger.error(
      { error },
      'RabbitMQ connection failed',
    );
  }

  app.listen(port, () => {
    logger.info(
      {
        port,
        service: 'data-service',
      },
      'Data service started',
    );
  });
}

void start();