import { Request, Response } from "express";
import path from "path";
import { existsSync, readFileSync } from "fs";

const resolveScriptPath = (filename: string) => {
  const candidatePaths = [
    path.resolve(__dirname, "../static/html/scripts", filename),
    path.resolve(__dirname, "../../src/static/html/scripts", filename),
  ];

  return candidatePaths.find((candidatePath) => existsSync(candidatePath));
};

export const getScriptLocal = async (req: Request, res: Response) => {
  try {
    const scriptPath = resolveScriptPath(req.params.file);

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
