export const MISSING_TCS_APPID_SOAP_FAULT = `<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/">
  <S:Body>
    <S:Fault xmlns:ns4="http://www.w3.org/2003/05/soap-envelope">
      <faultcode>S:Server</faultcode>
      <faultstring>TCS Error</faultstring>
      <detail>
        <ns2:TCSServiceFault xmlns:ns2="http://fms.treas.gov/services/tcsonline">
          <return_code>4019</return_code>
          <return_detail>No agency application found for given tcs_app_id.</return_detail>
        </ns2:TCSServiceFault>
      </detail>
    </S:Fault>
  </S:Body>
</S:Envelope>`;

export class MissingTcsAppIdError extends Error {
  public readonly statusCode: number = 400;
  public readonly body: string = MISSING_TCS_APPID_SOAP_FAULT;

  constructor() {
    super("Missing or invalid TCS App ID");
  }
}
