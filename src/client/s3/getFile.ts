import path from "path";
import { mkdirSync, readFileSync, existsSync } from "fs";
import {
  S3Client,
  GetObjectCommand,
  GetObjectCommandInput,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";

const s3Client = new S3Client({ region: "us-east-1" });

export type Filename = string;

// Helper function to convert a readable stream to a string
async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise<string>((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

export type GetFile = (file: Filename) => Promise<string>;

export const getFile: GetFile = (Key) => {
  switch (process.env.NODE_ENV) {
    case "local":
      return useLocal(Key);
    case "production":
      return useS3(Key);
  }
};

const useS3 = async (Key: Filename) => {
  const params: GetObjectCommandInput = {
    Bucket: process.env.BUCKET_NAME,
    Key,
  };

  const command = new GetObjectCommand(params);
  try {
    const result = await s3Client.send(command);
    if (!result.Body) throw "Transaction not found!";
    const contents = await streamToString(result.Body as Readable);
    return contents;
  } catch (err) {
    console.error("Error retrieving file", err);
    throw err;
  }
};

export const useLocal = async (Key: Filename) => {
  const resolvedPath = path.resolve(
    __dirname,
    "../../../dist/transactions",
    Key
  );
  const pathToTransactions = path.dirname(resolvedPath);

  createIfDoesNotExist(pathToTransactions);

  console.log({ Key, resolvedPath, pathToTransactions });

  const result = readFileSync(resolvedPath, "utf-8");
  console.log({ result });
  return result;
};

export const createIfDoesNotExist = (pathToCreate: string) => {
  const exists = existsSync(pathToCreate);
  if (exists) {
    return;
  }
  mkdirSync(pathToCreate);
};
