import { completeTransaction } from './completeTransaction';
import { InitiatedTransaction } from '../types/Transaction';

describe('completeTransaction', () => {
  const baseRequest: InitiatedTransaction = {
    agency_tracking_id: 'A1',
    transaction_amount: '100.00',
    url_success: 'https://success',
    url_cancel: 'https://cancel',
  } as InitiatedTransaction;

  describe("generic fields", () => {
    it('sets paid to true when transactionStatus is "Success"', () => {
      const result = completeTransaction(baseRequest, { transactionStatus: 'Success' });
      expect(result.paid).toBe(true);
    });

    it('sets paid to false when transactionStatus is "Failed"', () => {
      const result = completeTransaction(baseRequest, { transactionStatus: 'Failed' });
      expect(result.paid).toBe(false);
    });

    it('sets paid to true by default if transactionStatus is not provided', () => {
      const result = completeTransaction(baseRequest);
      expect(result.paid).toBe(true);
    });
  });

  describe("payment_type: ACH", () => {
    it('sets payment_type to the value in transaction.payment_type', () => {
      const request: InitiatedTransaction = {
        ...baseRequest,
        payment_type: 'ACH',
      };
      const result = completeTransaction(request);
      expect(result.payment_type).toBe('ACH');
    });
  });

  describe("payment_type: PLASTIC_CARD", () => {
    it('sets payment_type to the value in transaction.payment_type', () => {
      const request: InitiatedTransaction = {
        ...baseRequest,
        payment_type: 'PLASTIC_CARD',
      };
      const result = completeTransaction(request);
      expect(result.payment_type).toBe('PLASTIC_CARD');
    });
  });

  describe("payment_type: PAYPAL success", () => {
    it('sets payment_type to PAYPAL when transaction.payment_type is PAYPAL', () => {
      const request: InitiatedTransaction = {
        ...baseRequest,
        payment_type: 'PAYPAL',
      };
      const result = completeTransaction(request, { transactionStatus: 'Success' });
      expect(result.payment_type).toBe('PAYPAL');
      expect(result.paid).toBe(true);
    });
  });

  describe("payment_type: PAYPAL failed", () => {
    it('sets payment_type to PAYPAL and paid to false when failed_payment is set', () => {
      const request: InitiatedTransaction = {
        ...baseRequest,
        payment_type: 'PAYPAL',
        failed_payment: true,
      };
      const result = completeTransaction(request, { transactionStatus: 'Failed' });
      expect(result.payment_type).toBe('PAYPAL');
      expect(result.paid).toBe(false);
    });
  });

  describe("payment_type: none", () => {
    it('defaults payment_type to PLASTIC_CARD when transaction.payment_type is not provided', () => {
      const request: InitiatedTransaction = {
        ...baseRequest,
        payment_type: undefined,
      };
      const result = completeTransaction(request);
      expect(result.payment_type).toBe('PLASTIC_CARD');
    });
  });
});
