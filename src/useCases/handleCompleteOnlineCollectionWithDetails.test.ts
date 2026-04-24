import { isoDateTimeRegex, yyyyMmDdRegex } from '../useCaseHelpers/dateFormats';
import { handleCompleteOnlineCollectionWithDetails } from '../useCases/handleCompleteOnlineCollectionWithDetails';
import { MissingTokenError, MISSING_TOKEN_SOAP_FAULT } from '../errors/MissingTokenError';
import { XMLParser } from 'fast-xml-parser';

const toMoneyString = (value: string | number) => Number.parseFloat(String(value)).toFixed(2);

describe('handleCompleteOnlineCollectionWithDetails', () => {
  describe('when token is missing', () => {
    it('throws a MissingTokenError with statusCode 400 and SOAP fault body', async () => {
      const appContext = {
        persistenceGateway: () => ({
          getInitiatedTransaction: jest.fn(),
          saveCompletedTransaction: jest.fn(),
        }),
        useCaseHelpers: () => ({ completeTransaction: jest.fn(), buildXml: jest.fn() }),
      } as unknown as Parameters<typeof handleCompleteOnlineCollectionWithDetails>[0];

      const error = await handleCompleteOnlineCollectionWithDetails(appContext, {
        token: undefined,
      }).catch((e) => e);
      expect(error).toBeInstanceOf(MissingTokenError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe(MISSING_TOKEN_SOAP_FAULT);
    });
  });

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

  describe('Case: payment_type: "PLASTIC_CARD", no flags', () => {
    it('transaction_status: "Success", payment_type: "PLASTIC_CARD"', async () => {
      const now = new Date().toISOString();
      const appContext = {
        persistenceGateway: () => ({
          getInitiatedTransaction: jest.fn().mockResolvedValue({
            payment_type: 'PLASTIC_CARD',
            ach_initiated_at: undefined,
            failed_payment: undefined,
            agency_tracking_id: 'aid',
            transaction_amount: '10.00',
            url_success: 'success',
            url_cancel: 'cancel',
            tcp_appid: 'appid',
            token: 'tok',
          }),
          saveCompletedTransaction: jest.fn().mockResolvedValue(undefined),
        }),
        useCaseHelpers: () => ({
          completeTransaction: jest.fn().mockImplementation((transaction, { transactionStatus }) => ({
            paygov_tracking_id: 'pgid',
            agency_tracking_id: transaction.agency_tracking_id,
            transaction_amount: transaction.transaction_amount,
            transaction_type: 'Sale',
            transaction_date: now,
            payment_date: now.split('T')[0],
            transaction_status: transactionStatus,
            payment_type: transaction.payment_type,
            payment_frequency: 'ONE_TIME',
            number_of_installments: 1,
          })),
          buildXml,
        }),
      } as unknown as Parameters<typeof handleCompleteOnlineCollectionWithDetails>[0];

      const xml = await handleCompleteOnlineCollectionWithDetails(appContext, { token: 'tok' });
      const parser = new XMLParser({ parseTagValue: false });
      const parsed = parser.parse(xml);
      const transaction = parsed.completeOnlineCollectionWithDetailsResponse;
      expect(transaction.transaction_status).toBe('Success');
      expect(transaction.payment_type).toBe('PLASTIC_CARD');
      expect(transaction.transaction_date).toMatch(isoDateTimeRegex);
      expect(transaction.payment_date).toMatch(yyyyMmDdRegex);
      expect(toMoneyString(transaction.transaction_amount)).toBe('10.00');
    });
  });

  describe('Case: failed_payment: true', () => {
    it('transaction_status: "Failed"', async () => {
      const now = new Date().toISOString();
      const appContext = {
        persistenceGateway: () => ({
          getInitiatedTransaction: jest.fn().mockResolvedValue({
            payment_type: 'PLASTIC_CARD',
            failed_payment: true,
            agency_tracking_id: 'aid',
            transaction_amount: '10.00',
            url_success: 'success',
            url_cancel: 'cancel',
            tcp_appid: 'appid',
            token: 'tok',
          }),
          saveCompletedTransaction: jest.fn().mockResolvedValue(undefined),
        }),
        useCaseHelpers: () => ({
          completeTransaction: jest.fn().mockImplementation((transaction, { transactionStatus }) => ({
            paygov_tracking_id: 'pgid',
            agency_tracking_id: transaction.agency_tracking_id,
            transaction_amount: transaction.transaction_amount,
            transaction_type: 'Sale',
            transaction_date: now,
            payment_date: now.split('T')[0],
            transaction_status: transactionStatus,
            payment_type: transaction.payment_type,
            payment_frequency: 'ONE_TIME',
            number_of_installments: 1,
          })),
          buildXml,
        }),
      } as unknown as Parameters<typeof handleCompleteOnlineCollectionWithDetails>[0];

      const xml = await handleCompleteOnlineCollectionWithDetails(appContext, { token: 'tok' });
      const parser = new XMLParser({ parseTagValue: false });
      const parsed = parser.parse(xml);
      const transaction = parsed.completeOnlineCollectionWithDetailsResponse;
      expect(transaction.transaction_status).toBe('Failed');
      expect(transaction.transaction_date).toMatch(isoDateTimeRegex);
      expect(transaction.payment_date).toMatch(yyyyMmDdRegex);
      expect(toMoneyString(transaction.transaction_amount)).toBe('10.00');
    });
  });

  describe('Case: payment_type: "ACH", ach_initiated_at < 15s ago', () => {
    it('transaction_status: "Received", payment_type: "ACH"', async () => {
      const now = new Date();
      const achInitiatedAt = new Date(now.getTime() - 5 * 1000).toISOString(); // 5s ago
      const appContext = {
        persistenceGateway: () => ({
          getInitiatedTransaction: jest.fn().mockResolvedValue({
            payment_type: 'ACH',
            ach_initiated_at: achInitiatedAt,
            agency_tracking_id: 'aid',
            transaction_amount: '10.00',
            url_success: 'success',
            url_cancel: 'cancel',
            tcp_appid: 'appid',
            token: 'tok',
          }),
          saveCompletedTransaction: jest.fn().mockResolvedValue(undefined),
        }),
        useCaseHelpers: () => ({
          completeTransaction: jest.fn().mockImplementation((transaction, { transactionStatus }) => ({
            paygov_tracking_id: 'pgid',
            agency_tracking_id: transaction.agency_tracking_id,
            transaction_amount: transaction.transaction_amount,
            transaction_type: 'Sale',
            transaction_date: now.toISOString(),
            payment_date: now.toISOString().split('T')[0],
            transaction_status: transactionStatus,
            payment_type: transaction.payment_type,
            payment_frequency: 'ONE_TIME',
            number_of_installments: 1,
          })),
          buildXml,
        }),
      } as unknown as Parameters<typeof handleCompleteOnlineCollectionWithDetails>[0];

      const xml = await handleCompleteOnlineCollectionWithDetails(appContext, { token: 'tok' });
      const parser = new XMLParser({ parseTagValue: false });
      const parsed = parser.parse(xml);
      const transaction = parsed.completeOnlineCollectionWithDetailsResponse;
      expect(transaction.transaction_status).toBe('Received');
      expect(transaction.payment_type).toBe('ACH');
      expect(transaction.transaction_date).toMatch(isoDateTimeRegex);
      expect(transaction.payment_date).toMatch(yyyyMmDdRegex);
      expect(toMoneyString(transaction.transaction_amount)).toBe('10.00');
    });
  });

  describe('Case: payment_type: "ACH", ach_initiated_at >= 15s ago', () => {
    it('transaction_status: "Success", payment_type: "ACH"', async () => {
      const now = new Date();
      const achInitiatedAt = new Date(now.getTime() - 16 * 1000).toISOString(); // 16s ago
      const appContext = {
        persistenceGateway: () => ({
          getInitiatedTransaction: jest.fn().mockResolvedValue({
            payment_type: 'ACH',
            ach_initiated_at: achInitiatedAt,
            agency_tracking_id: 'aid',
            transaction_amount: '10.00',
            url_success: 'success',
            url_cancel: 'cancel',
            tcp_appid: 'appid',
            token: 'tok',
          }),
          saveCompletedTransaction: jest.fn().mockResolvedValue(undefined),
        }),
        useCaseHelpers: () => ({
          completeTransaction: jest.fn().mockImplementation((transaction, { transactionStatus }) => ({
            paygov_tracking_id: 'pgid',
            agency_tracking_id: transaction.agency_tracking_id,
            transaction_amount: transaction.transaction_amount,
            transaction_type: 'Sale',
            transaction_date: now.toISOString(),
            payment_date: now.toISOString().split('T')[0],
            transaction_status: transactionStatus,
            payment_type: transaction.payment_type,
            payment_frequency: 'ONE_TIME',
            number_of_installments: 1,
          })),
          buildXml,
        }),
      } as unknown as Parameters<typeof handleCompleteOnlineCollectionWithDetails>[0];

      const xml = await handleCompleteOnlineCollectionWithDetails(appContext, { token: 'tok' });
      const parser = new XMLParser({ parseTagValue: false });
      const parsed = parser.parse(xml);
      const transaction = parsed.completeOnlineCollectionWithDetailsResponse;
      expect(transaction.transaction_status).toBe('Success');
      expect(transaction.payment_type).toBe('ACH');
      expect(transaction.transaction_date).toMatch(isoDateTimeRegex);
      expect(transaction.payment_date).toMatch(yyyyMmDdRegex);
      expect(toMoneyString(transaction.transaction_amount)).toBe('10.00');
    });
  });
});
