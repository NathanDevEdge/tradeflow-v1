// AWS S3 storage helpers for TradeFlow
// Files are stored in your own S3 bucket with public read access

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { ENV } from './_core/env';

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function getS3Client(): S3Client {
  if (!ENV.s3AccessKeyId || !ENV.s3SecretAccessKey) {
    throw new Error(
      "S3 credentials missing: set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
    );
  }
  if (!ENV.s3BucketName) {
    throw new Error("S3 bucket name missing: set AWS_S3_BUCKET");
  }
  return new S3Client({
    region: ENV.s3Region,
    credentials: {
      accessKeyId: ENV.s3AccessKeyId,
      secretAccessKey: ENV.s3SecretAccessKey,
    },
  });
}

function buildPublicUrl(key: string): string {
  return `https://${ENV.s3BucketName}.s3.${ENV.s3Region}.amazonaws.com/${key}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const key = normalizeKey(relKey);
  const body = typeof data === "string" ? Buffer.from(data) : data;

  await client.send(
    new PutObjectCommand({
      Bucket: ENV.s3BucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return { key, url: buildPublicUrl(key) };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: buildPublicUrl(key) };
}
