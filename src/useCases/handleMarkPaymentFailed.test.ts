import { handleMarkPaymentFailed } from '../useCases/handleMarkPaymentFailed';

describe('handleMarkPaymentFailed', () => {
  it('marks payment as failed if not already failed', async () => {
    const appContext = {
      persistenceGateway: () => ({
        getTransactionRequest: jest.fn().mockResolvedValue({ failed_payment: false }),
        saveTransactionRequest: jest.fn().mockResolvedValue(undefined),
      }),
    } as any;
    await expect(handleMarkPaymentFailed(appContext, { token: 'tok' })).resolves.toBeUndefined();
  });

  it('throws if already marked failed', async () => {
    const appContext = {
      persistenceGateway: () => ({
        getTransactionRequest: jest.fn().mockResolvedValue({ failed_payment: true }),
        saveTransactionRequest: jest.fn(),
      }),
    } as any;
    await expect(handleMarkPaymentFailed(appContext, { token: 'tok' })).rejects.toThrow('Token already marked failed');
  });
});
