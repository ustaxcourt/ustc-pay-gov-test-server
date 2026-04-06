import type { SaveFile } from "../../types/SaveFile";

export const saveFileLocal: SaveFile = async (appContext, { key, data }) => {
  appContext.files[key] = data;
};
