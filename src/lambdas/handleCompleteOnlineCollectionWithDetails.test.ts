import { handleCompleteOnlineCollectionWithDetails } from '../useCases/handleCompleteOnlineCollectionWithDetails';

describe('handleCompleteOnlineCollectionWithDetails', () => {
  it('returns XML for a successful transaction', async () => {
    const appContext = {
      persistenceGateway: () => ({
        getTransactionRequest: jest.fn().mockResolvedValue({ failed_payment: false }),
        saveCompletedTransaction: jest.fn().mockResolvedValue(undefined),
      }),
      useCaseHelpers: () => ({
        completeTransaction: jest.fn().mockReturnValue({ foo: 'bar' }),
        buildXml: jest.fn().mockReturnValue('<xml>success</xml>'),
      }),
    } as unknown as Parameters<typeof handleCompleteOnlineCollectionWithDetails>[0];
    const xml = await handleCompleteOnlineCollectionWithDetails(appContext, { token: 'tok' });
    expect(xml).toBe('<xml>success</xml>');
  });

  it('returns XML for a failed transaction', async () => {
    const appContext = {
      persistenceGateway: () => ({
        getTransactionRequest: jest.fn().mockResolvedValue({ failed_payment: true }),
        saveCompletedTransaction: jest.fn().mockResolvedValue(undefined),
      }),
      useCaseHelpers: () => ({
        completeTransaction: jest.fn().mockReturnValue({ foo: 'bar' }),
        buildXml: jest.fn().mockReturnValue('<xml>failed</xml>'),
      }),
    } as unknown as Parameters<typeof handleCompleteOnlineCollectionWithDetails>[0];
    const xml = await handleCompleteOnlineCollectionWithDetails(appContext, { token: 'tok' });
    expect(xml).toBe('<xml>failed</xml>');
  });
});
