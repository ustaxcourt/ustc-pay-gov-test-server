import path from "path";
import { readFileSync } from "fs";
import { Filename } from "../../types/Filename";
import { createIfDoesNotExist } from "./createIfDoesNotExist";

export const getFileLocal = async (filename: Filename): Promise<string> => {
  const resolvedPath = path.resolve(__dirname, "../../../resources", filename);
  const pathToTransactions = path.dirname(resolvedPath);

  createIfDoesNotExist(pathToTransactions);

  const result = readFileSync(resolvedPath, "utf-8");
  return result;
};
