export const MISSING_TOKEN_SOAP_FAULT = `<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/">
  <S:Body>
    <S:Fault xmlns:ns4="http://www.w3.org/2003/05/soap-envelope">
      <faultcode>S:Server</faultcode>
      <faultstring>TCS Error</faultstring>
      <detail>
        <ns2:TCSServiceFault xmlns:ns2="http://fms.treas.gov/services/tcsonline">
          <return_code>4117</return_code>
          <return_detail>Token does not exist, has been acted upon already, or is too old and cannot be acted upon.</return_detail>
        </ns2:TCSServiceFault>
      </detail>
    </S:Fault>
  </S:Body>
</S:Envelope>`;


export class MissingTokenError extends Error {
  public statusCode: number = 400;

  constructor() {
    super(MISSING_TOKEN_SOAP_FAULT);
  }
}
