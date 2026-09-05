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

export const getOrgInvoices = (orgUuid: string): Promise<ThriftInvoice[]> =>
  api.get(`/thrift/orgs/${orgUuid}/billing/invoices/`).then((r) => r.data);

export const getOrgBillingStatus = (orgUuid: string): Promise<{ can_generate_invoice: boolean }> =>
  api.get(`/thrift/orgs/${orgUuid}/billing/status/`).then((r) => r.data);

export const generateOrgInvoice = (orgUuid: string) =>
  api.post(`/thrift/orgs/${orgUuid}/billing/invoices/generate/`).then((r) => r.data);

export const payOrgInvoice = (orgUuid: string, invoiceId: number): Promise<{ payment_link?: string }> =>
  api.post(`/thrift/orgs/${orgUuid}/billing/invoices/${invoiceId}/pay/`).then((r) => r.data);

export const verifyOrgInvoice = (orgUuid: string, invoiceId: number, txRef: string) =>
  api.post(`/thrift/orgs/${orgUuid}/billing/invoices/${invoiceId}/verify/`, { tx_ref: txRef }).then((r) => r.data);
