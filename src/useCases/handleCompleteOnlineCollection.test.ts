import { handleCompleteOnlineCollection } from './handleCompleteOnlineCollection';
import { MissingTokenError, MISSING_TOKEN_SOAP_FAULT } from '../errors/MissingTokenError';
import { XMLParser } from 'fast-xml-parser';
import { buildAppContext } from '../useCaseHelpers/testAppContext';

function buildXml({ response, responseType }: { response: any; responseType: string }) {
  return `<${responseType}><paygov_tracking_id>${response.paygov_tracking_id}</paygov_tracking_id></${responseType}>`;
}

describe('handleCompleteOnlineCollection', () => {
  describe('when token is missing', () => {
    it('throws a MissingTokenError with statusCode 400 and SOAP fault body', async () => {
      const appContext = buildAppContext();

      const error = await handleCompleteOnlineCollection(appContext, { token: undefined }).catch(
        (e) => e
      );
      expect(error).toBeInstanceOf(MissingTokenError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe(MISSING_TOKEN_SOAP_FAULT);
    });
  });

  describe('when token is provided', () => {
    it('returns XML with paygov_tracking_id', async () => {
      const appContext = buildAppContext({
        getInitiatedTransaction: jest.fn().mockResolvedValue({ token: 'tok' }),
        saveCompletedTransaction: jest.fn().mockResolvedValue(undefined),
        completeTransaction: jest.fn().mockReturnValue({ paygov_tracking_id: 'pgid' }),
        buildXml,
      });

      const xml = await handleCompleteOnlineCollection(appContext, { token: 'tok' });
      const parser = new XMLParser({ parseTagValue: false });
      const parsed = parser.parse(xml);
      expect(parsed.completeOnlineCollectionResponse.paygov_tracking_id).toBe('pgid');
    });
  });
});
