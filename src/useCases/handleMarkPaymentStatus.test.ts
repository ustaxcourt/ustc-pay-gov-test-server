import { handleMarkPaymentStatus } from "./handleMarkPaymentStatus";

describe('handleMarkPaymentStatus', () => {
  it('updates transaction with failed payment', async () => {
    const getInitiatedTransaction = jest.fn().mockResolvedValue({
      token: 'tok',
      url_success: 'success',
    });
    const saveInitiatedTransaction = jest.fn().mockResolvedValue(undefined);
    const appContext = {
      persistenceGateway: () => ({
        getInitiatedTransaction,
        saveInitiatedTransaction,
      }),
    } as unknown as Parameters<typeof handleMarkPaymentStatus>[0];

    const result = await handleMarkPaymentStatus(appContext, {
      token: 'tok',
      paymentMethod: 'PLASTIC_CARD',
      paymentStatus: 'Failed',
    });

    expect(getInitiatedTransaction).toHaveBeenCalledWith(appContext, 'tok');
    expect(saveInitiatedTransaction).toHaveBeenCalledWith(appContext, {
      token: 'tok',
      url_success: 'success',
      payment_type: 'PLASTIC_CARD',
      failed_payment: true,
    });
    expect(result).toBe('success');
  });

  it('updates transaction with ACH success', async () => {
    const getInitiatedTransaction = jest.fn().mockResolvedValue({
      token: 'tok',
      url_success: 'success',
    });
    const saveInitiatedTransaction = jest.fn().mockResolvedValue(undefined);
    const appContext = {
      persistenceGateway: () => ({
        getInitiatedTransaction,
        saveInitiatedTransaction,
      }),
    } as unknown as Parameters<typeof handleMarkPaymentStatus>[0];

    const result = await handleMarkPaymentStatus(appContext, {
      token: 'tok',
      paymentMethod: 'ACH',
      paymentStatus: 'Success',
    });

    expect(getInitiatedTransaction).toHaveBeenCalledWith(appContext, 'tok');
    expect(saveInitiatedTransaction).toHaveBeenCalledWith(appContext, {
      token: 'tok',
      url_success: 'success',
      payment_type: 'ACH',
      ach_initiated_at: expect.any(String),
    });
    expect(result).toBe('success');
  });
});
