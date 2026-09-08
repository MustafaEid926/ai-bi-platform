import crypto from 'node:crypto';

import {
  AnalyticsQuery,
  AnalyticsResult,
} from '../types/analytics.types.js';

import { DatasetVersionService } from './dataset-version.service.js';
import { MinioReader } from '../storage/minio.reader.js';
import { CsvParser } from '../parsers/csv.parser.js';
import { FilterEngine } from '../engine/filter.engine.js';
import { QueryEngine } from '../engine/query.engine.js';
import { SchemaInference } from '../engine/schema.inference.js';
import { QueryValidator } from '../engine/query.validator.js';

export class AnalyticsService {
  constructor(
    private readonly datasetVersionService: DatasetVersionService,
    private readonly minioReader: MinioReader,
    private readonly csvParser: CsvParser,
    private readonly filterEngine: FilterEngine,
    private readonly queryEngine: QueryEngine,
    private readonly schemaInference: SchemaInference,
    private readonly queryValidator: QueryValidator,
  ) {}

  async executeQuery(
    query: AnalyticsQuery,
    organizationId: string,
  ): Promise<AnalyticsResult> {
    const startedAt = performance.now();

    /*
     * 1. Resolve dataset version through Data Service.
     */
    const version =
      await this.datasetVersionService.resolve(
        query.datasetId,
        query.versionId,
        organizationId,
      );

    /*
     * 2. Read the actual dataset from MinIO.
     */
    const buffer =
      await this.minioReader.readObject(
        version.object_key,
      );

    /*
     * 3. Parse CSV into normalized rows.
     */
    const rows = this.csvParser.parse(buffer);
    
    const schema =
    this.schemaInference.infer(rows);

    this.queryValidator.validate(
      query,
      schema,
    );
    /*
     * 4. Apply filters.
     */
    const filteredRows =
      this.filterEngine.apply(
        rows,
        query.filters,
      );

    /*
     * 5. Execute dimensions + measures.
     */
    const resultRows =
      this.queryEngine.execute(
        filteredRows,
        {
          dimensions: query.dimensions,
          measures: query.measures,
        },
      );

    /*
     * 6. Convert object rows into tabular result.
     */
    const columns = [
      ...query.dimensions,
      ...query.measures.map(
        (measure) =>
          measure.alias ??
          `${measure.aggregation}_${measure.field}`,
      ),
    ];

    const resultData = resultRows.map(
      (row) =>
        columns.map(
          (column) => row[column] ?? null,
        ),
    );

    return {
      queryId: crypto.randomUUID(),
      definition: query,
      columns,
      rows: resultData,
      executionTimeMs: Math.round(
        performance.now() - startedAt,
      ),
    };
  }
}