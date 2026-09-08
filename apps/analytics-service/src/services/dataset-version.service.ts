import {
  DataServiceClient,
  DatasetVersion,
} from '../clients/data-service.client.js';

export class DatasetVersionService {
  constructor(
    private readonly dataServiceClient: DataServiceClient,
  ) {}

  async resolve(
    datasetId: string,
    versionId: string,
    organizationId: string,
  ): Promise<DatasetVersion> {
    const version =
      await this.dataServiceClient.getDatasetVersion(
        datasetId,
        versionId,
        organizationId,
      );

    if (version.status !== 'UPLOADED') {
      throw new Error(
        `Dataset version ${versionId} is not ready for analytics`,
      );
    }

    if (!version.object_key) {
      throw new Error(
        `Dataset version ${versionId} has no object key`,
      );
    }

    return version;
  }
}