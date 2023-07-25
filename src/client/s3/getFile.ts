import {
  S3Client,
  GetObjectCommand,
  GetObjectCommandInput,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { GetFile } from "../../types/GetFile";

const s3Client = new S3Client({ region: "us-east-1" });

// Helper function to convert a readable stream to a string
async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise<string>((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

export const getFileS3: GetFile = async (_appContext, Key) => {
  const params: GetObjectCommandInput = {
    Bucket: process.env.BUCKET_NAME,
    Key,
  };

  const command = new GetObjectCommand(params);
  try {
    const result = await s3Client.send(command);
    if (!result.Body) throw new Error("Transaction not found!");
    const contents = await streamToString(result.Body as Readable);
    return contents;
  } catch (err) {
    console.error("Error retrieving file", err);
    throw err;
  }
};
