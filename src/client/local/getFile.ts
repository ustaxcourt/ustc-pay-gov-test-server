import path from "path";
import { readFileSync } from "fs";
import { NotFoundError } from "../../errors/NotFoundError";
import { GetFile } from "../../types/GetFile";

const hasParentTraversalSegment = (filename: string): boolean => {
  return filename.split(/[\\/]+/).includes("..");
};

export const getFileLocal: GetFile = async (appContext, filename) => {
  if (
    filename.substring(0, 5) === "html/" ||
    filename.substring(0, 5) === "wsdl/"
  ) {
    const staticRoot = path.resolve(__dirname, "../../../src/static");
    if (path.isAbsolute(filename) || hasParentTraversalSegment(filename)) {
      throw new NotFoundError("File not found");
    }

    const resolvedPath = path.resolve(staticRoot, filename);
    const relativePath = path.relative(staticRoot, resolvedPath);
    const isWithinStaticRoot =
      relativePath !== "" &&
      !relativePath.startsWith("..") &&
      !path.isAbsolute(relativePath);

    if (!isWithinStaticRoot) {
      throw new NotFoundError("File not found");
    }

    try {
      return readFileSync(resolvedPath, "utf-8");
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        throw error;
      }

      throw new NotFoundError("File not found");
    }
  }

  if (appContext.files[filename]) {
    return appContext.files[filename];
  }

  throw new NotFoundError("File not found");
};
