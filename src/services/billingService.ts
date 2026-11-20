import api from './api';

export interface ThriftInvoice {
  id: number;
  month_label: string;
  status: 'paid' | 'overdue' | 'pending';
  is_bank: boolean;
  total_fee: number | string;
  paid_at?: string | null;
  tx_ref?: string | null;
  line_items: {
    group_name: string;
    member_count: number;
    rate_percent: string;
    fee: number | string;
  }[];
}

export interface PaginatedInvoices {
  count: number;
  next: string | null;
  previous: string | null;
  results: ThriftInvoice[];
}

export const getOrgInvoices = (orgUuid: string, page: number): Promise<PaginatedInvoices> =>
  api.get(`/thrift/orgs/${orgUuid}/billing/invoices/`, { params: { page } }).then((r) => r.data);

export const getOrgBillingStatus = (orgUuid: string): Promise<{ can_generate_invoice: boolean }> =>
  api.get(`/thrift/orgs/${orgUuid}/billing/status/`).then((r) => r.data);

export const generateOrgInvoice = (orgUuid: string) =>
  api.post(`/thrift/orgs/${orgUuid}/billing/invoices/generate/`).then((r) => r.data);

export const payOrgInvoice = (orgUuid: string, invoiceId: number, redirectUrl?: string): Promise<{ payment_link?: string }> =>
  api.post(`/thrift/orgs/${orgUuid}/billing/invoices/${invoiceId}/pay/`, {
    ...(redirectUrl ? { redirect_url: redirectUrl } : {}),
  }).then((r) => r.data);

// Was sending `tx_ref` -- the backend (ThriftOrgInvoiceVerifyView, core/views.py)
// only ever reads `transaction_id`, so this request always failed with
// "transaction_id required." no matter what the user typed in.
export const verifyOrgInvoice = (orgUuid: string, invoiceId: number, transactionId: string) =>
  api.post(`/thrift/orgs/${orgUuid}/billing/invoices/${invoiceId}/verify/`, { transaction_id: transactionId }).then((r) => r.data);
