import {
  CreateBucketCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '@aibi/config';

export class MinioStorage {
  private readonly client: S3Client;
  private readonly presignClient: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = env.minio.bucket;

    // Used by the data-service inside Docker.
    this.client = new S3Client({
      endpoint: `http://${env.minio.endpoint}:${env.minio.port}`,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.minio.accessKey,
        secretAccessKey: env.minio.secretKey,
      },
    });

    // Used only to generate URLs accessible by the client/browser.
    this.presignClient = new S3Client({
      endpoint: `http://${env.minio.publicEndpoint}:${env.minio.port}`,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.minio.accessKey,
        secretAccessKey: env.minio.secretKey,
      },
    });
  }

  async ensureBucket(): Promise<void> {
    try {
      await this.client.send(
        new HeadBucketCommand({
          Bucket: this.bucket,
        }),
      );
    } catch {
      await this.client.send(
        new CreateBucketCommand({
          Bucket: this.bucket,
        }),
      );
    }
  }

  async createUploadUrl(
    objectKey: string,
    contentType: string,
    expiresIn = 900,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: contentType,
    });

    return getSignedUrl(this.presignClient, command, {
      expiresIn,
    });
  }

  async headObject(objectKey: string) {
    return this.client.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      }),
    );
  }

  async objectExists(objectKey: string): Promise<boolean> {
    try {
      await this.headObject(objectKey);

      return true;
    } catch {
      return false;
    }
  }
}
