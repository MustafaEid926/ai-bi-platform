import { env } from '@aibi/config';
import { AppError } from '@aibi/errors';

export interface DatasetVersion {
  id: string;
  dataset_id: string;
  organization_id: string;
  version_number: number;
  status: string;
  original_filename: string;
  object_key: string;
  file_size_bytes: number | string | null;
  content_type: string | null;
  checksum: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface DataServiceResponse<T> {
  data: T;
}

export class DataServiceClient {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env.DATA_SERVICE_URL ??
      'http://localhost:3002';
  }

  async getDatasetVersion(
    datasetId: string,
    versionId: string,
    organizationId: string,
    ): Promise<DatasetVersion> {
    const url =
        `${this.baseUrl}/api/v1/datasets/` +
        `${datasetId}/versions/${versionId}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
        'X-Organization-ID': organizationId,
        },
    });

    if (!response.ok) {
        const body = await response.text();

        if (response.status === 404) {
        throw new AppError(
            'DATASET_VERSION_NOT_FOUND',
            404,
            'Dataset version not found',
        );
        }

        throw new AppError(
        'DATA_SERVICE_ERROR',
        502,
        `Data Service request failed: ${response.status}`,
        body,
        );
    }

    const body =
        (await response.json()) as DataServiceResponse<DatasetVersion>;

    return body.data;
    }
}