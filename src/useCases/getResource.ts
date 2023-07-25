import { AppContext } from "../types/AppContext";
import { ResourceRequest } from "../types/ResourceRequest";

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
    throw "Not found";
  }

  const contents = await appContext.storageClient().getFile(`wsdl/${filename}`);

  return contents.replace(
    "%%location%%",
    `https://${process.env.BASE_URL}/wsdl/`
  );
};
