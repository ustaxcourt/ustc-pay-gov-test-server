import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import type { SaveFileCommand } from "../../types/SaveFileCommand";

const s3Client = new S3Client({ region: "us-east-1" });
export type SaveFile = (command: SaveFileCommand) => Promise<void>;

export const saveFile: SaveFile = async ({ key, data }) => {
  const params: PutObjectCommandInput = {
    Bucket: process.env.BUCKET_NAME,
    Body: data,
    Key: key,
  };
  const command = new PutObjectCommand(params);
  try {
    await s3Client.send(command);
  } catch (err) {
    console.error("error saving a file", err);
    throw err;
  }
};
