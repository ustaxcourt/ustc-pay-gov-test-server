import { xmlOptions } from "../xmlOptions";
import { XMLBuilder } from "fast-xml-parser";

export function buildXml(obj: object) {
  const builder = new XMLBuilder(xmlOptions);
  return builder.build(obj);
}
