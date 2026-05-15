import { isLocal } from "../config/appEnv";
import { getFileS3 } from "./s3/getFile";
import { saveFileS3 } from "./s3/saveFile";

import { getFileLocal } from "./local/getFile";
import { saveFileLocal } from "./local/saveFile";

export function storageClient() {
  return isLocal()
    ? {
        getFile: getFileLocal,
        saveFile: saveFileLocal,
      }
    : {
        getFile: getFileS3,
        saveFile: saveFileS3,
      };
}
