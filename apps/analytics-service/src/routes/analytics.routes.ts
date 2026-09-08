import { Router } from 'express';

import { AnalyticsController } from '../controllers/analytics.controller.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { DatasetVersionService } from '../services/dataset-version.service.js';

import { DataServiceClient } from '../clients/data-service.client.js';
import { MinioReader } from '../storage/minio.reader.js';
import { CsvParser } from '../parsers/csv.parser.js';

import { FilterEngine } from '../engine/filter.engine.js';
import { QueryEngine } from '../engine/query.engine.js';
import { AggregationEngine } from '../engine/aggregation.engine.js';
import { QueryValidator } from '../engine/query.validator.js';
import { SchemaInference } from '../engine/schema.inference.js';

const router: Router = Router();

/*
 * Infrastructure
 */
const dataServiceClient =
  new DataServiceClient();

const minioReader =
  new MinioReader();

const csvParser =
  new CsvParser();

/*
 * Domain / Engine
 */
const filterEngine =
  new FilterEngine();

const aggregationEngine =
  new AggregationEngine();

const queryEngine =
  new QueryEngine(
    aggregationEngine,
  );

/*
 * Services
 */
const datasetVersionService =
  new DatasetVersionService(
    dataServiceClient,
  );

const schemaInference =
  new SchemaInference();

const queryValidator =
  new QueryValidator();

const analyticsService =
  new AnalyticsService(
    datasetVersionService,
    minioReader,
    csvParser,
    filterEngine,
    queryEngine,
    schemaInference,
    queryValidator,
  );

/*
 * Controller
 */
const controller =
  new AnalyticsController(
    analyticsService,
  );

/*
 * Routes
 */
router.post(
  '/query',
  controller.query,
);

router.get(
  '/queries/:id',
  controller.getQuery,
);

export {
  router as analyticsRouter,
};
