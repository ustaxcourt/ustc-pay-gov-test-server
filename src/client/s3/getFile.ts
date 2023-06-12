import {
  S3Client,
  GetObjectCommand,
  GetObjectCommandInput,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";

// Helper function to convert a readable stream to a string
async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise<string>((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

export async function getFile(Key: string): Promise<string> {
  const client = new S3Client({ region: "us-east-1" });
  const params: GetObjectCommandInput = {
    Bucket: process.env.BUCKET_NAME,
    Key,
  };

  const command = new GetObjectCommand(params);
  try {
    const result = await client.send(command);
    if (!result.Body) throw "Transaction not found!";
    const contents = await streamToString(result.Body as Readable);
    return contents;
  } catch (err) {
    console.error("Error retrieving file", err);
    throw err;
  }
}
