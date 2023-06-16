export type TransactionRequest = {
  token: string;
  url_success: string;
  url_cancel: string;
  amount: number;
  tcp_appid: string;
  agency_tracking_id: string;
};

export type CompletedTransaction = {
  token: string;
  url_success: string;
  url_cancel: string;
  amount: number;
  tcp_appid: string;
  agency_tracking_id: string;
  paid: boolean;
  pay_gov_tracking_id?: string;
};
