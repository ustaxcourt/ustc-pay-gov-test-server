import { handleGetDetails } from './handleGetDetails';

describe('handleGetDetails', () => {
  it('returns XML for a completed transaction', async () => {
    const appContext = {
      persistenceGateway: () => ({
        getCompletedTransaction: jest.fn().mockResolvedValue({
          paygov_tracking_id: 'id',
          agency_tracking_id: 'aid',
          transaction_amount: '10.00',
          transaction_type: 'Sale',
          transaction_date: '2026-04-07',
          payment_date: '2026-04-07',
          transaction_status: 'Success',
          payment_type: 'PLASTIC_CARD',
          payment_frequency: 'ONE_TIME',
          number_of_installments: 1,
        }),
      }),
      useCaseHelpers: () => ({
        buildXml: jest.fn().mockReturnValue('<xml>details</xml>'),
      }),
    } as unknown as Parameters<typeof handleGetDetails>[0];
    const xml = await handleGetDetails(appContext, { paygov_tracking_id: 'id' });
    expect(xml).toBe('<xml>details</xml>');
  });
});
