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
    rate_percent: number;
    bank_rate_percent?: number | null;
    fee: number | string;
  }[];
}

export const getOrgInvoices = (orgUuid: string): Promise<ThriftInvoice[]> =>
  api.get(`/thrift/orgs/${orgUuid}/invoices/`).then((r) => r.data);

export const generateOrgInvoice = (orgUuid: string) =>
  api.post(`/thrift/orgs/${orgUuid}/invoices/generate/`).then((r) => r.data);

export const payOrgInvoice = (orgUuid: string, invoiceId: number): Promise<{ payment_link?: string }> =>
  api.post(`/thrift/orgs/${orgUuid}/invoices/${invoiceId}/pay/`).then((r) => r.data);

export const verifyOrgInvoice = (orgUuid: string, invoiceId: number, txRef: string) =>
  api.post(`/thrift/orgs/${orgUuid}/invoices/${invoiceId}/verify/`, { tx_ref: txRef }).then((r) => r.data);
