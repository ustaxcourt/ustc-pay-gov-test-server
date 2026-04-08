import { completeTransaction } from './completeTransaction';
import { TransactionRequest } from '../types/Transaction';

describe('completeTransaction', () => {
  const baseRequest: TransactionRequest = {
    agency_tracking_id: 'A1',
    transaction_amount: '100.00',
    url_success: 'https://success',
    url_cancel: 'https://cancel',
    // add any other required TransactionRequest fields here
  } as TransactionRequest;

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
