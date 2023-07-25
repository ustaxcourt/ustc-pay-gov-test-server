import path from "path";
import { readFileSync } from "fs";
import { NotFoundError } from "../../errors/NotFoundError";
import { GetFile } from "../../types/GetFile";

export const getFileLocal: GetFile = async (appContext, filename) => {
  if (filename.substring(0, 5) === "html/") {
    const resolvedPath = path.resolve(
      __dirname,
      "../../../src/static",
      filename
    );
    return readFileSync(resolvedPath, "utf-8");
  }

  if (filename.substring(0, 5) === "wsdl/") {
    return "todo: we need to make this file in filesystem";
  }

  if (appContext.files[filename]) {
    return appContext.files[filename];
  }

  throw new NotFoundError("Could not find file");
};
