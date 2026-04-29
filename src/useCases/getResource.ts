import { AppContext } from "../types/AppContext";
import { ResourceRequest } from "../types/ResourceRequest";
import { NotFoundError } from "../errors/NotFoundError";

export type GetResource = (
  appContext: AppContext,
  { filename }: ResourceRequest
) => Promise<string>;

export const getResource: GetResource = async (appContext, { filename }) => {
  const supportedFiles = [
    "TCSOnlineService_3_1.wsdl",
    "TCSOnlineService_3_1.xsd",
    "tcs_common_types.xsd",
  ];

  if (!filename) {
    filename = "TCSOnlineService_3_1.wsdl";
  } else if (!supportedFiles.includes(filename)) {
    throw new NotFoundError("Not found");
  }

  const contents = await appContext
    .storageClient()
    .getFile(appContext, `wsdl/${filename}`);

  return contents.replaceAll(
    "%%location%%",
    `${process.env.BASE_URL}/wsdl/`
  );
};
