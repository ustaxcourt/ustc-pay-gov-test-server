const getXmlErrorTemplate = (
  errorCode: string,
  errorMessage: string,
): string => {
  const xmlError = `<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/">
    <S:Body>
      <S:Fault xmlns:ns4="http://www.w3.org/2003/05/soap-envelope">
        <faultcode>S:Server</faultcode>
        <faultstring>TCS Error</faultstring>
        <detail>
          <ns2:TCSServiceFault xmlns:ns2="http://fms.treas.gov/services/tcsonline">
            <return_code>${errorCode}</return_code>
            <return_detail>${errorMessage}</return_detail>
          </ns2:TCSServiceFault>
        </detail>
      </S:Fault>
    </S:Body>
  </S:Envelope>`;

  return xmlError;
};

export const MISSING_TOKEN_SOAP_FAULT = getXmlErrorTemplate(
  "4117",
  "Token does not exist, has been acted upon already, or is too old and cannot be acted upon.",
);

export const MISSING_TCS_APPID_SOAP_FAULT = getXmlErrorTemplate(
  "4019",
  "No agency application found for given tcs_app_id.",
);
