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

  it('updates transaction with ACH failed', async () => {
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
      paymentStatus: 'Failed',
    });

    expect(getInitiatedTransaction).toHaveBeenCalledWith(appContext, 'tok');
    expect(saveInitiatedTransaction).toHaveBeenCalledWith(appContext, {
      token: 'tok',
      url_success: 'success',
      payment_type: 'ACH',
      failed_payment: true,
      ach_initiated_at: expect.any(String),
    });
    expect(result).toBe('success');
  });

  it('updates transaction with PAYPAL success', async () => {
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
      paymentMethod: 'PAYPAL',
      paymentStatus: 'Success',
    });

    expect(getInitiatedTransaction).toHaveBeenCalledWith(appContext, 'tok');
    expect(saveInitiatedTransaction).toHaveBeenCalledWith(appContext, {
      token: 'tok',
      url_success: 'success',
      payment_type: 'PAYPAL',
    });
    expect(result).toBe('success');
  });

  it('updates transaction with PLASTIC_CARD success', async () => {
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
      paymentStatus: 'Success',
    });

    expect(getInitiatedTransaction).toHaveBeenCalledWith(appContext, 'tok');
    expect(saveInitiatedTransaction).toHaveBeenCalledWith(appContext, {
      token: 'tok',
      url_success: 'success',
      payment_type: 'PLASTIC_CARD',
    });
    expect(result).toBe('success');
  });

  it('throws error if token already marked failed', async () => {
    const getInitiatedTransaction = jest.fn().mockResolvedValue({
      token: 'tok',
      url_success: 'success',
      failed_payment: true,
    });
    const saveInitiatedTransaction = jest.fn().mockResolvedValue(undefined);
    const appContext = {
      persistenceGateway: () => ({
        getInitiatedTransaction,
        saveInitiatedTransaction,
      }),
    } as unknown as Parameters<typeof handleMarkPaymentStatus>[0];

    await expect(
      handleMarkPaymentStatus(appContext, {
        token: 'tok',
        paymentMethod: 'PLASTIC_CARD',
        paymentStatus: 'Failed',
      })
    ).rejects.toThrow('Token already marked failed');
  });

  it('throws error if token already marked as ACH (double-ACH guard)', async () => {
    const getInitiatedTransaction = jest.fn().mockResolvedValue({
      token: 'tok',
      url_success: 'success',
      payment_type: 'ACH',
      ach_initiated_at: new Date().toISOString(),
    });
    const saveInitiatedTransaction = jest.fn().mockResolvedValue(undefined);
    const appContext = {
      persistenceGateway: () => ({
        getInitiatedTransaction,
        saveInitiatedTransaction,
      }),
    } as unknown as Parameters<typeof handleMarkPaymentStatus>[0];

    await expect(
      handleMarkPaymentStatus(appContext, {
        token: 'tok',
        paymentMethod: 'ACH',
        paymentStatus: 'Success',
      })
    ).rejects.toThrow('Token already marked as ACH');
  });

  it('throws error if token already marked as PAYPAL (double-PAYPAL guard)', async () => {
    const getInitiatedTransaction = jest.fn().mockResolvedValue({
      token: 'tok',
      url_success: 'success',
      payment_type: 'PAYPAL',
    });
    const saveInitiatedTransaction = jest.fn().mockResolvedValue(undefined);
    const appContext = {
      persistenceGateway: () => ({
        getInitiatedTransaction,
        saveInitiatedTransaction,
      }),
    } as unknown as Parameters<typeof handleMarkPaymentStatus>[0];

    await expect(
      handleMarkPaymentStatus(appContext, {
        token: 'tok',
        paymentMethod: 'PAYPAL',
        paymentStatus: 'Success',
      })
    ).rejects.toThrow('Token already marked as PAYPAL');
  });

  it('throws error if attempting to mark failed after PAYPAL was selected', async () => {
    const getInitiatedTransaction = jest.fn().mockResolvedValue({
      token: 'tok',
      url_success: 'success',
      payment_type: 'PAYPAL',
    });
    const saveInitiatedTransaction = jest.fn().mockResolvedValue(undefined);
    const appContext = {
      persistenceGateway: () => ({
        getInitiatedTransaction,
        saveInitiatedTransaction,
      }),
    } as unknown as Parameters<typeof handleMarkPaymentStatus>[0];

    await expect(
      handleMarkPaymentStatus(appContext, {
        token: 'tok',
        paymentMethod: 'PLASTIC_CARD',
        paymentStatus: 'Failed',
      })
    ).rejects.toThrow('Token already marked as PAYPAL');
  });

  it('throws error if attempting to mark failed after ACH was initiated', async () => {
    const getInitiatedTransaction = jest.fn().mockResolvedValue({
      token: 'tok',
      url_success: 'success',
      payment_type: 'ACH',
      ach_initiated_at: new Date().toISOString(),
    });
    const saveInitiatedTransaction = jest.fn().mockResolvedValue(undefined);
    const appContext = {
      persistenceGateway: () => ({
        getInitiatedTransaction,
        saveInitiatedTransaction,
      }),
    } as unknown as Parameters<typeof handleMarkPaymentStatus>[0];

    await expect(
      handleMarkPaymentStatus(appContext, {
        token: 'tok',
        paymentMethod: 'PLASTIC_CARD',
        paymentStatus: 'Failed',
      })
    ).rejects.toThrow('Token already marked as ACH');
  });
});
