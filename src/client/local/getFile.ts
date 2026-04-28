import path from "path";
import { readFileSync } from "fs";
import { NotFoundError } from "../../errors/NotFoundError";
import { GetFile } from "../../types/GetFile";

const hasParentTraversalSegment = (filename: string): boolean => {
  return path.normalize(filename).split(path.sep).includes("..");
};

export const getFileLocal: GetFile = async (appContext, filename) => {
  if (filename.startsWith("html/") || filename.startsWith("wsdl/")) {
    const staticRoot = path.resolve(__dirname, "../../../src/static");
    if (path.isAbsolute(filename) || hasParentTraversalSegment(filename)) {
      throw new NotFoundError("File not found");
    }

    const resolvedPath = path.resolve(staticRoot, filename);
    const relativePath = path.relative(staticRoot, resolvedPath);

    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
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
