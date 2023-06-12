import { XMLParser } from "fast-xml-parser";
import { handleStartOnlineCollection } from "./handleStartOnlineCollection";
import { handleCompleteOnlineCollection } from "./handleCompleteOnlineCollection";

export async function handleSoapRequest(req: any, res: any) {
  const xmlBodyData = req.apiGateway.event.body;
  const parser = new XMLParser();
  const jObj = parser.parse(xmlBodyData);

  const actionKey = Object.keys(jObj["soap:Envelope"]["soap:Body"])[0];

  console.log({ actionKey });
  let result;
  switch (actionKey) {
    case "tns:startOnlineCollection":
      console.log(
        jObj["soap:Envelope"]["soap:Body"]["tns:startOnlineCollection"][
          "tns:startOnlineCollectionRequest"
        ]
      );
      result = await handleStartOnlineCollection(
        jObj["soap:Envelope"]["soap:Body"]["tns:startOnlineCollection"][
          "tns:startOnlineCollectionRequest"
        ]
      );

      res.send(result);
      break;
    case "tns:completeOnlineCollection":
      console.log(
        jObj["soap:Envelope"]["soap:Body"]["tns:completeOnlineCollection"][
          "tns:completeOnlineCollectionRequest"
        ]
      );
      result = await handleCompleteOnlineCollection(
        jObj["soap:Envelope"]["soap:Body"]["tns:completeOnlineCollection"][
          "tns:completeOnlineCollectionRequest"
        ]
      );
      res.send(result);
      break;
    default:
      res.send(404);
      break;
  }
}
