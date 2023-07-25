export type TransactionRequest = {
  token: string;
  url_success: string;
  url_cancel: string;
  transaction_amount: string;
  tcp_appid: string;
  agency_tracking_id: string;
};

export type CompletedTransaction = {
  token: string;
  url_success: string;
  url_cancel: string;
  transaction_amount: string;
  tcp_appid: string;
  agency_tracking_id: string;
  paid: boolean;
  paygov_tracking_id?: string;
};
