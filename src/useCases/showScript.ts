import { AppContext } from "../types/AppContext";
import { NotFoundError } from "../errors/NotFoundError";

export type ShowScript = (
  appContext: AppContext,
  { file }: { file: string },
) => Promise<string>;

const ALLOWED_SCRIPT_FILES = new Set(["override-links.js"]);

const isValidScriptFileName = (file: string): boolean => {
  if (!file || file !== file.trim()) {
    return false;
  }

  if (file.includes("/") || file.includes("\\") || file.includes("..")) {
    return false;
  }

  if (!/^[A-Za-z0-9._-]+\.js$/.test(file)) {
    return false;
  }

  return ALLOWED_SCRIPT_FILES.has(file);
};

const isStorageNotFoundError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const errorWithCode = error as Error & { code?: string };
  return (
    error.name === "NotFoundError" ||
    errorWithCode.code === "ENOENT" ||
    errorWithCode.code === "NotFound" ||
    message.includes("not found") ||
    message.includes("no such file")
  );
};

export const showScript: ShowScript = async (appContext, { file }) => {
  if (!isValidScriptFileName(file)) {
    throw new NotFoundError("File not found");
  }

  try {
    const script = await appContext
      .storageClient()
      .getFile(appContext, `html/scripts/${file}`);

    if (!script) {
      throw new NotFoundError("File not found");
    }

    return script;
  } catch (error) {
    if (isStorageNotFoundError(error)) {
      throw new NotFoundError("File not found");
    }

    throw error;
  }
};
