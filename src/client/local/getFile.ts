import path from "path";
import { readFileSync } from "fs";
import { Filename } from "../../types/Filename";
import { createIfDoesNotExist } from "./createIfDoesNotExist";

export const getFileLocal = async (Key: Filename): Promise<string> => {
  const resolvedPath = path.resolve(
    __dirname,
    "../../../dist/transactions",
    Key
  );
  const pathToTransactions = path.dirname(resolvedPath);

  createIfDoesNotExist(pathToTransactions);
  const result = readFileSync(resolvedPath, "utf-8");
  return result;
};
