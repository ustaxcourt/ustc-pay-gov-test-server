import { handleCompleteOnlineCollection } from './handleCompleteOnlineCollection';
import { MissingTokenError, MISSING_TOKEN_SOAP_FAULT } from '../errors/MissingTokenError';
import { XMLParser } from 'fast-xml-parser';

function buildXml({ response, responseType }: { response: any; responseType: string }) {
  return `<${responseType}><paygov_tracking_id>${response.paygov_tracking_id}</paygov_tracking_id></${responseType}>`;
}

describe('handleCompleteOnlineCollection', () => {
  describe('when token is missing', () => {
    it('throws a MissingTokenError with statusCode 400', async () => {
      const appContext = {
        persistenceGateway: () => ({
          getInitiatedTransaction: jest.fn(),
          saveCompletedTransaction: jest.fn(),
        }),
        useCaseHelpers: () => ({ completeTransaction: jest.fn(), buildXml }),
      } as unknown as Parameters<typeof handleCompleteOnlineCollection>[0];

      await expect(
        handleCompleteOnlineCollection(appContext, { token: undefined })
      ).rejects.toThrow(MissingTokenError);
    });

    it('throws an error with the SOAP fault body and statusCode 400', async () => {
      const appContext = {
        persistenceGateway: () => ({
          getInitiatedTransaction: jest.fn(),
          saveCompletedTransaction: jest.fn(),
        }),
        useCaseHelpers: () => ({ completeTransaction: jest.fn(), buildXml }),
      } as unknown as Parameters<typeof handleCompleteOnlineCollection>[0];

      const error = await handleCompleteOnlineCollection(appContext, { token: undefined }).catch(
        (e) => e
      );
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe(MISSING_TOKEN_SOAP_FAULT);
    });
  });

  describe('when token is provided', () => {
    it('returns XML with paygov_tracking_id', async () => {
      const appContext = {
        persistenceGateway: () => ({
          getInitiatedTransaction: jest.fn().mockResolvedValue({ token: 'tok' }),
          saveCompletedTransaction: jest.fn().mockResolvedValue(undefined),
        }),
        useCaseHelpers: () => ({
          completeTransaction: jest.fn().mockReturnValue({ paygov_tracking_id: 'pgid' }),
          buildXml,
        }),
      } as unknown as Parameters<typeof handleCompleteOnlineCollection>[0];

      const xml = await handleCompleteOnlineCollection(appContext, { token: 'tok' });
      const parser = new XMLParser({ parseTagValue: false });
      const parsed = parser.parse(xml);
      expect(parsed.completeOnlineCollectionResponse.paygov_tracking_id).toBe('pgid');
    });
  });
});
