import path from "path";
import { writeFileSync } from "fs";
import { Filename } from "../../types/Filename";
import { createIfDoesNotExist } from "./createIfDoesNotExist";
import type { SaveFile } from "../../types/SaveFile";

export const saveFileLocal: SaveFile = async ({ key, data }) => {
  const resolvedPath = path.resolve(__dirname, "../../../resources", key);
  const pathToTransactions = path.dirname(resolvedPath);

  createIfDoesNotExist(pathToTransactions);
  writeFileSync(resolvedPath, data);
};
