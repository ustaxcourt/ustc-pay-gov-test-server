import { getFileFromS3 } from "../persistence/getFileFromS3";

export async function getFile(req: any, res: any) {
  const supportedFiles = ["TCSOnlineService_3_2.xsd", "tcs_common_types.xsd"];
  let filename;
  console.log(req.params);
  if (!req.params?.file) {
    filename = "TCSOnlineService_3_2.wsdl";
  } else if (supportedFiles.includes(req.params.file)) {
    filename = req.params.file;
  } else {
    return res.send(404);
  }

  const contents = await getFileFromS3(`wsdl/${filename}`);

  return res.send(
    contents.replace("%%location%%", `${process.env.BASE_URL}/wsdl/`)
  );
}
