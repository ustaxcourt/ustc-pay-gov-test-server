import path from "path";
import { readFileSync } from "fs";
import { NotFoundError } from "../../errors/NotFoundError";
import { GetFile } from "../../types/GetFile";

const wsdlFixtures: Record<string, string> = {
  "wsdl/TCSOnlineService_3_1.wsdl": `<?xml version="1.0" encoding="UTF-8"?>\n<definitions name="TCSOnlineService_3_1" xmlns="http://schemas.xmlsoap.org/wsdl/">\n  <documentation>USTC Pay.gov Test Server WSDL fixture</documentation>\n  <types>\n    <xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n      <xsd:import schemaLocation="%%location%%TCSOnlineService_3_1.xsd"/>\n      <xsd:import schemaLocation="%%location%%tcs_common_types.xsd"/>\n    </xsd:schema>\n  </types>\n</definitions>`,
  "wsdl/TCSOnlineService_3_1.xsd": `<?xml version="1.0" encoding="UTF-8"?>\n<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema" targetNamespace="http://fms.treas.gov/services/tcsonline_3_1" elementFormDefault="qualified">\n  <xsd:element name="startOnlineCollectionRequest" type="xsd:string"/>\n</xsd:schema>`,
  "wsdl/tcs_common_types.xsd": `<?xml version="1.0" encoding="UTF-8"?>\n<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema" targetNamespace="http://fms.treas.gov/services/tcsonline_3_1/common" elementFormDefault="qualified">\n  <xsd:simpleType name="paymentStatus">\n    <xsd:restriction base="xsd:string">\n      <xsd:enumeration value="Success"/>\n      <xsd:enumeration value="Failed"/>\n    </xsd:restriction>\n  </xsd:simpleType>\n</xsd:schema>`,
};

export const getFileLocal: GetFile = async (appContext, filename) => {
  if (filename.substring(0, 5) === "html/") {
    const resolvedPath = path.resolve(
      __dirname,
      "../../../src/static",
      filename
    );
    return readFileSync(resolvedPath, "utf-8");
  }

  if (filename.substring(0, 5) === "wsdl/") {
    const fixture = wsdlFixtures[filename];
    if (fixture) {
      return fixture;
    }

    throw new NotFoundError("Could not find file");
  }

  if (appContext.files[filename]) {
    return appContext.files[filename];
  }

  throw new NotFoundError("Could not find file");
};
