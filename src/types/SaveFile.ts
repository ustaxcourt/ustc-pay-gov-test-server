import { AppContext } from "./AppContext";

export type SaveFile = (
  appContext: AppContext,
  {
    key,
    data,
  }: {
    key: string;
    data: string;
  }
) => Promise<void>;
