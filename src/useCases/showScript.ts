import { AppContext } from "../types/AppContext";
import { NotFoundError } from "../errors/NotFoundError";

export type ShowScript = (
  appContext: AppContext,
  { file }: { file: string }
) => Promise<string>;

export const showScript: ShowScript = async (appContext, { file }) => {
  const script = await appContext
    .storageClient()
    .getFile(appContext, `html/scripts/${file}`);

  if (!script) {
    throw new NotFoundError("Could not find file");
  }
  return script;
};
