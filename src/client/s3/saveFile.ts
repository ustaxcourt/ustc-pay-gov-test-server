import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: "us-east-1" });

export async function saveFile({ key, data }: { key: string; data: string }) {
  const params: PutObjectCommandInput = {
    Bucket: process.env.BUCKET_NAME,
    Body: data,
    Key: key,
  };
  const command = new PutObjectCommand(params);
  try {
    const result = await s3Client.send(command);
    return result;
  } catch (err) {
    console.error("error saving a file", err);
    throw err;
  }
}
