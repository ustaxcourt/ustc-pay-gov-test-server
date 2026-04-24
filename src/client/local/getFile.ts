import path from "path";
import { readFileSync } from "fs";
import { NotFoundError } from "../../errors/NotFoundError";
import { GetFile } from "../../types/GetFile";

export const getFileLocal: GetFile = async (appContext, filename) => {
  if (
    filename.substring(0, 5) === "html/" ||
    filename.substring(0, 5) === "wsdl/"
  ) {
    const staticRoot = path.resolve(__dirname, "../../../src/static");
    if (path.isAbsolute(filename)) {
      throw new NotFoundError("Could not find file");
    }

    const resolvedPath = path.resolve(staticRoot, filename);
    const relativePath = path.relative(staticRoot, resolvedPath);
    const isWithinStaticRoot =
      relativePath !== "" &&
      !relativePath.startsWith("..") &&
      !path.isAbsolute(relativePath);

    if (!isWithinStaticRoot) {
      throw new NotFoundError("Could not find file");
    }

    try {
      return readFileSync(resolvedPath, "utf-8");
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        throw error;
      }

      throw new NotFoundError("Could not find file");
    }
  }

  if (appContext.files[filename]) {
    return appContext.files[filename];
  }

  throw new NotFoundError("Could not find file");
};
