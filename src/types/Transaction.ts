import { TransactionStatus } from "./TransactionStatus";

export type TransactionType = "Sale" | "Authorization";
export type PaymentType = "PLASTIC_CARD" | "ACH" | "AMAZON" | "PAYPAL";
export type PaymentFrequencyType = "ONE_TIME";

export type TransactionRequest = {
  agency_tracking_id: string;
  tcp_appid: string;
  transaction_amount: string;
  url_cancel: string;
  url_success: string;
};

export type InitiatedTransaction = TransactionRequest & {
  failed_payment?: boolean;
  token: string;
};

export type CompletedTransaction = {
  agency_tracking_id: string;
  number_of_installments: number;
  paid: boolean;
  paygov_tracking_id: string;
  payment_date: string;
  payment_frequency: PaymentFrequencyType;
  payment_type: PaymentType;
  tcp_appid: string;
  token: string;
  transaction_amount: string;
  transaction_date: string;
  transaction_status: TransactionStatus;
  transaction_type: TransactionType;
  url_cancel: string;
  url_success: string;
};
