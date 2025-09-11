import { getFileS3 } from "./s3/getFile";
import { saveFileS3 } from "./s3/saveFile";

import { getFileLocal } from "./local/getFile";
import { saveFileLocal } from "./local/saveFile";

export function storageClient() {
  switch (process.env.NODE_ENV) {
    case "local":
      return {
        getFile: getFileLocal,
        saveFile: saveFileLocal,
      };
    case "development":
      return {
        getFile: getFileS3,
        saveFile: saveFileS3,
      };
  }
}
