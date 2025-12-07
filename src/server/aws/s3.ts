// src/server/aws/s3.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "~/env";

export const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function uploadEmailHtmlToS3(params: {
  threadId: string;
  html: string;
}) {
  const key = `emails/${params.threadId}.html`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      Body: params.html,
      ContentType: "text/html; charset=utf-8",
    }),
  );

  return {
    key,
    url: `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`,
  };
}
