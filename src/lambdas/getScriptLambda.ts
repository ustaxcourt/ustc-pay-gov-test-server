import { Request, Response } from "express";
import path from "path";
import { existsSync, readFileSync } from "fs";

// Validates that the filename is a simple name without any path components
// and only contains allowed characters
const isSafeFilename = (filename: string) => {
  if (!filename) {
    return false;
  }

  if (path.basename(filename) !== filename) {
    return false;
  }

  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return false;
  }

  return /^[a-zA-Z0-9._-]+$/.test(filename);
};

// Checks if the resolved path is within the specified base directory
const isWithinBaseDir = (baseDir: string, fullPath: string) => {
  const relativePath = path.relative(baseDir, fullPath);
  return !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
};

const resolveScriptPath = (filename: string) => {
  if (!isSafeFilename(filename)) {
    return undefined;
  }

  const candidateBaseDirs = [
    path.resolve(__dirname, "../static/html/scripts"),
    path.resolve(__dirname, "../../src/static/html/scripts"),
  ];

  const candidatePaths = candidateBaseDirs
    .map((baseDir) => path.resolve(baseDir, filename))
    .filter((candidatePath, index) =>
      isWithinBaseDir(candidateBaseDirs[index], candidatePath)
    );

  return candidatePaths.find((candidatePath) => existsSync(candidatePath));
};

export const getScriptLocal = async (req: Request, res: Response) => {
  try {
    const scriptPath = resolveScriptPath(req.params.file || "");

    if (!scriptPath) {
      throw new Error("File not found");
    }

    const content = readFileSync(scriptPath, "utf-8");
    res.setHeader("Content-Type", "application/javascript");
    res.send(content);
  } catch (_err) {
    res.status(404).send("File not found");
  }
};
