import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";

export async function saveFileToS3({
  key,
  data,
}: {
  key: string;
  data: string;
}) {
  const client = new S3Client({ region: "us-east-1" });
  const params: PutObjectCommandInput = {
    Bucket: process.env.BUCKET_NAME,
    Body: data,
    Key: key,
  };
  const command = new PutObjectCommand(params);
  await client.send(command);
}
