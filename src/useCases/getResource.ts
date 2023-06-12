type ResourceRequest = {
  filename?: string;
};

export async function getResource(
  appContext: any,
  { filename }: ResourceRequest
): Promise<string> {
  const supportedFiles = [
    "TCSOnlineService_3_2.wsdl",
    "TCSOnlineService_3_2.xsd",
    "tcs_common_types.xsd",
  ];

  if (!filename) {
    filename = "TCSOnlineService_3_2.wsdl";
  } else if (!supportedFiles.includes(filename)) {
    throw "Not found";
  }

  const contents = await appContext.storageClient().getFile(`wsdl/${filename}`);

  return contents.replace("%%location%%", `${process.env.BASE_URL}/wsdl/`);
}
