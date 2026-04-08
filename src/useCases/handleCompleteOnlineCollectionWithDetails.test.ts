import { isoDateTimeRegex, yyyyMmDdRegex } from '../useCaseHelpers/dateFormats';
import { handleCompleteOnlineCollectionWithDetails } from '../useCases/handleCompleteOnlineCollectionWithDetails';
import { XMLParser } from 'fast-xml-parser';

const toMoneyString = (value: string | number) => Number.parseFloat(String(value)).toFixed(2);

describe('handleCompleteOnlineCollectionWithDetails', () => {
  it('returns XML for a successful transaction', async () => {
    // Use a real XML serializer for buildXml
    function buildXml({ response, responseType }: { response: any; responseType: string }) {
      const t = response;
      return `
        <${responseType}>
          <paygov_tracking_id>${t.paygov_tracking_id}</paygov_tracking_id>
          <agency_tracking_id>${t.agency_tracking_id}</agency_tracking_id>
          <transaction_amount>${t.transaction_amount}</transaction_amount>
          <transaction_type>${t.transaction_type}</transaction_type>
          <transaction_date>${t.transaction_date}</transaction_date>
          <payment_date>${t.payment_date}</payment_date>
          <transaction_status>${t.transaction_status}</transaction_status>
          <payment_type>${t.payment_type}</payment_type>
          <payment_frequency>${t.payment_frequency}</payment_frequency>
          <number_of_installments>${t.number_of_installments}</number_of_installments>
        </${responseType}>
      `.replace(/\s+/g, ' ').trim();
    }

    const appContext = {
      persistenceGateway: () => ({
        getInitiatedTransaction: jest.fn().mockResolvedValue({ failed_payment: false }),
        saveCompletedTransaction: jest.fn().mockResolvedValue(undefined),
      }),
      useCaseHelpers: () => ({
        completeTransaction: jest.fn().mockReturnValue({
          paygov_tracking_id: 'pgid',
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
        buildXml,
      }),
    } as unknown as Parameters<typeof handleCompleteOnlineCollectionWithDetails>[0];

    const xml = await handleCompleteOnlineCollectionWithDetails(appContext, { token: 'tok' });

    // Parse the XML and assert on its structure and values
    const parser = new XMLParser({ parseTagValue: false });
    const parsed = parser.parse(xml);
    const transaction = parsed.completeOnlineCollectionWithDetailsResponse;

    expect(transaction.paygov_tracking_id).toBe('pgid');
    expect(transaction.agency_tracking_id).toBe('aid');
    expect(toMoneyString(transaction.transaction_amount)).toBe('10.00');
    expect(transaction.transaction_type).toBe('Sale');
    expect(transaction.transaction_date).toMatch(isoDateTimeRegex);
    expect(transaction.payment_date).toMatch(yyyyMmDdRegex);
    expect(transaction.transaction_status).toBe('Success');
    expect(transaction.payment_type).toBe('PLASTIC_CARD');
    expect(transaction.payment_frequency).toBe('ONE_TIME');
    expect(Number(transaction.number_of_installments)).toBe(1);
    expect(transaction.shipping_address_return_message).toBeUndefined();
  });

  it('returns XML for a failed transaction', async () => {
    // Use a real XML serializer for buildXml
    function buildXml({ response, responseType }: { response: any; responseType: string }) {
      const t = response;
      return `
        <${responseType}>
          <paygov_tracking_id>${t.paygov_tracking_id}</paygov_tracking_id>
          <agency_tracking_id>${t.agency_tracking_id}</agency_tracking_id>
          <transaction_amount>${t.transaction_amount}</transaction_amount>
          <transaction_type>${t.transaction_type}</transaction_type>
          <transaction_date>${t.transaction_date}</transaction_date>
          <payment_date>${t.payment_date}</payment_date>
          <transaction_status>${t.transaction_status}</transaction_status>
          <payment_type>${t.payment_type}</payment_type>
          <payment_frequency>${t.payment_frequency}</payment_frequency>
          <number_of_installments>${t.number_of_installments}</number_of_installments>
        </${responseType}>
      `.replace(/\s+/g, ' ').trim();
    }

    const appContext = {
      persistenceGateway: () => ({
        getInitiatedTransaction: jest.fn().mockResolvedValue({ failed_payment: true }),
        saveCompletedTransaction: jest.fn().mockResolvedValue(undefined),
      }),
      useCaseHelpers: () => ({
        completeTransaction: jest.fn().mockReturnValue({
          paygov_tracking_id: 'pgid',
          agency_tracking_id: 'aid',
          transaction_amount: '10.00',
          transaction_type: 'Sale',
          transaction_date: '2026-04-07T12:00:00Z',
          payment_date: '2026-04-07',
          transaction_status: 'Failed',
          payment_type: 'PLASTIC_CARD',
          payment_frequency: 'ONE_TIME',
          number_of_installments: 1,
        }),
        buildXml,
      }),
    } as unknown as Parameters<typeof handleCompleteOnlineCollectionWithDetails>[0];

    const xml = await handleCompleteOnlineCollectionWithDetails(appContext, { token: 'tok' });

    // Parse the XML and assert on its structure and values
    const parser = new XMLParser({ parseTagValue: false });
    const parsed = parser.parse(xml);
    const transaction = parsed.completeOnlineCollectionWithDetailsResponse;

    expect(transaction.paygov_tracking_id).toBe('pgid');
    expect(transaction.agency_tracking_id).toBe('aid');
    expect(toMoneyString(transaction.transaction_amount)).toBe('10.00');
    expect(transaction.transaction_type).toBe('Sale');
    expect(transaction.transaction_date).toMatch(isoDateTimeRegex);
    expect(transaction.payment_date).toMatch(yyyyMmDdRegex);
    expect(transaction.transaction_status).toBe('Failed');
    expect(transaction.payment_type).toBe('PLASTIC_CARD');
    expect(transaction.payment_frequency).toBe('ONE_TIME');
    expect(Number(transaction.number_of_installments)).toBe(1);
    expect(transaction.shipping_address_return_message).toBeUndefined();
  });
});
