export type CompleteTransactionRequest = {
  token?: string | undefined;
  tcs_app_id?: string | undefined;
  agency_tracking_id?: string;
  transaction_type?: string;
  transaction_amount?: string;
  language?: string;
  url_success?: string;
  url_cancel?: string;
};
