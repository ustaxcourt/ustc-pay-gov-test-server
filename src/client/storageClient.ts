import { getFile } from "./s3/getFile";
import { saveFile } from "./s3/saveFile";

export function storageClient() {
  return {
    getFile,
    saveFile,
  };
}
