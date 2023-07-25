import { AppContext } from "./AppContext";
import { Filename } from "./Filename";

export type GetFile = (
  appContext: AppContext,
  file: Filename
) => Promise<string>;
