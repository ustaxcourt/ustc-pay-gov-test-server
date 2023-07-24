import { xmlOptions } from "../xmlOptions";
import { XMLBuilder } from "fast-xml-parser";

export type BuildXml = (obj: object) => string;

export const buildXml: BuildXml = (obj) => {
  const builder = new XMLBuilder(xmlOptions);
  return builder.build(obj);
};
