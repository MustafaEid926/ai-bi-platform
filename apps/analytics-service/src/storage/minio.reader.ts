import {
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import { env } from '@aibi/config';

export class MinioReader {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = env.minio.bucket;

    this.client = new S3Client({
      endpoint: `http://${env.minio.endpoint}:${env.minio.port}`,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.minio.accessKey,
        secretAccessKey: env.minio.secretKey,
      },
    });
  }

  async readObject(objectKey: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      }),
    );

    if (!response.Body) {
      throw new Error(
        `Object body is empty for key: ${objectKey}`,
      );
    }

    return Buffer.from(
      await response.Body.transformToByteArray(),
    );
  }
}
