import { mkdirSync, existsSync } from "fs";

export const createIfDoesNotExist = (pathToCreate: string) => {
  const exists = existsSync(pathToCreate);
  if (exists) {
    return;
  }
  mkdirSync(pathToCreate);
};
