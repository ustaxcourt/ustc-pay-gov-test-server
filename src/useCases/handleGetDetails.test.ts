import { handleGetDetails } from './handleGetDetails';
import { isoDateTimeRegex, yyyyMmDdRegex } from '../useCaseHelpers/dateFormats';

describe('handleGetDetails', () => {
  it('returns XML for a completed transaction', async () => {
    const buildXml = jest.fn().mockReturnValue('<xml>details</xml>');

    const appContext = {
      persistenceGateway: () => ({
        getCompletedTransaction: jest.fn().mockResolvedValue({
          paygov_tracking_id: 'id',
          agency_tracking_id: 'aid',
          transaction_amount: '10.00',
          transaction_type: 'Sale',
          transaction_date: '2026-04-07T12:00:00Z',
          payment_date: '2026-04-07',
          transaction_status: 'Success',
          payment_type: 'PLASTIC_CARD',
          payment_frequency: 'ONE_TIME',
          number_of_installments: 1,
        }),
      }),
      useCaseHelpers: () => ({
        buildXml,
      }),
    } as unknown as Parameters<typeof handleGetDetails>[0];

    const xml = await handleGetDetails(appContext, { paygov_tracking_id: 'id' });

    expect(xml).toBe('<xml>details</xml>');

    const buildXmlArg = buildXml.mock.calls[0][0] as {
      response: {
        transactions: Array<{
          transaction: {
            transaction_date: string;
            payment_date: string;
          };
        }>;
      };
    };

    const transaction = buildXmlArg.response.transactions[0].transaction;
    expect(Date.parse(transaction.transaction_date)).not.toBeNaN();
    expect(transaction.transaction_date).toMatch(isoDateTimeRegex);
    expect(transaction.payment_date).toMatch(yyyyMmDdRegex);
  });
});
