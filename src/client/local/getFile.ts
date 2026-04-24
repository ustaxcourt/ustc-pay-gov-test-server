import path from "path";
import { readFileSync } from "fs";
import { NotFoundError } from "../../errors/NotFoundError";
import { GetFile } from "../../types/GetFile";

export const getFileLocal: GetFile = async (appContext, filename) => {
  if (filename.substring(0, 5) === "html/" || filename.substring(0, 5) === "wsdl/") {
    const resolvedPath = path.resolve(
      __dirname,
      "../../../src/static",
      filename
    );
    try {
      return readFileSync(resolvedPath, "utf-8");
    } catch {
      throw new NotFoundError("Could not find file");
    }
  }

  if (appContext.files[filename]) {
    return appContext.files[filename];
  }

  throw new NotFoundError("Could not find file");
};
