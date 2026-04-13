import { handleGetDetails } from './handleGetDetails';
import { isoDateTimeRegex, yyyyMmDdRegex } from '../useCaseHelpers/dateFormats';
import { XMLParser } from 'fast-xml-parser';
import { DateTime } from 'luxon';

const toMoneyString = (value: string | number) => Number.parseFloat(String(value)).toFixed(2);

function buildXml({ response, responseType }: { response: any; responseType: string }) {
  const t = response.transactions[0].transaction;
  return `
    <${responseType}>
      <transactions>
        <transaction>
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
        </transaction>
      </transactions>
    </${responseType}>
  `.replace(/\s+/g, ' ').trim();
}

const baseCompletedTransaction = {
  token: 'tok',
  paygov_tracking_id: 'pgid',
  agency_tracking_id: 'aid',
  transaction_amount: '10.00',
  transaction_type: 'Sale',
  transaction_date: '2026-04-07T12:00:00Z',
  payment_date: '2026-04-07',
  payment_type: 'PLASTIC_CARD',
  payment_frequency: 'ONE_TIME',
  number_of_installments: 1,
};

function makeAppContext(completedTransaction: object, initiatedTransaction: object) {
  return {
    persistenceGateway: () => ({
      getCompletedTransaction: jest.fn().mockResolvedValue(completedTransaction),
      getInitiatedTransaction: jest.fn().mockResolvedValue(initiatedTransaction),
    }),
    useCaseHelpers: () => ({ buildXml }),
  } as unknown as Parameters<typeof handleGetDetails>[0];
}

describe('handleGetDetails', () => {
  describe('PLASTIC_CARD success', () => {
    it('returns transaction_status: Success and payment_type: PLASTIC_CARD', async () => {
      const appContext = makeAppContext(
        { ...baseCompletedTransaction, transaction_status: 'Success' },
        { token: 'tok', payment_type: 'PLASTIC_CARD' }
      );

      const xml = await handleGetDetails(appContext, { paygov_tracking_id: 'pgid' });
      const parser = new XMLParser({ parseTagValue: false });
      const transaction = parser.parse(xml).getDetailsResponse.transactions.transaction;

      expect(transaction.transaction_status).toBe('Success');
      expect(transaction.payment_type).toBe('PLASTIC_CARD');
      expect(toMoneyString(transaction.transaction_amount)).toBe('10.00');
      expect(transaction.transaction_date).toMatch(isoDateTimeRegex);
      expect(transaction.payment_date).toMatch(yyyyMmDdRegex);
      expect(transaction.shipping_address_return_message).toBeUndefined();
    });
  });

  describe('PLASTIC_CARD failed', () => {
    it('returns transaction_status: Failed', async () => {
      const appContext = makeAppContext(
        { ...baseCompletedTransaction, transaction_status: 'Failed' },
        { token: 'tok', payment_type: 'PLASTIC_CARD', failed_payment: true }
      );

      const xml = await handleGetDetails(appContext, { paygov_tracking_id: 'pgid' });
      const parser = new XMLParser({ parseTagValue: false });
      const transaction = parser.parse(xml).getDetailsResponse.transactions.transaction;

      expect(transaction.transaction_status).toBe('Failed');
    });
  });

  describe('ACH within 15 seconds', () => {
    it('returns transaction_status: Received and payment_type: ACH', async () => {
      const achInitiatedAt = DateTime.now().minus({ seconds: 5 }).toJSDate().toISOString();
      const appContext = makeAppContext(
        { ...baseCompletedTransaction, payment_type: 'ACH', transaction_status: 'Received' },
        { token: 'tok', payment_type: 'ACH', ach_initiated_at: achInitiatedAt }
      );

      const xml = await handleGetDetails(appContext, { paygov_tracking_id: 'pgid' });
      const parser = new XMLParser({ parseTagValue: false });
      const transaction = parser.parse(xml).getDetailsResponse.transactions.transaction;

      expect(transaction.transaction_status).toBe('Received');
      expect(transaction.payment_type).toBe('ACH');
    });
  });

  describe('ACH after 15 seconds', () => {
    it('returns transaction_status: Success and payment_type: ACH', async () => {
      const achInitiatedAt = DateTime.now().minus({ seconds: 16 }).toJSDate().toISOString();
      const appContext = makeAppContext(
        { ...baseCompletedTransaction, payment_type: 'ACH', transaction_status: 'Success' },
        { token: 'tok', payment_type: 'ACH', ach_initiated_at: achInitiatedAt }
      );

      const xml = await handleGetDetails(appContext, { paygov_tracking_id: 'pgid' });
      const parser = new XMLParser({ parseTagValue: false });
      const transaction = parser.parse(xml).getDetailsResponse.transactions.transaction;

      expect(transaction.transaction_status).toBe('Success');
      expect(transaction.payment_type).toBe('ACH');
    });
  });
});
