import { ApiClient } from './api-client';
import { getAuthSession } from './auth.service';

export type SupportStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type PartnerStatus = 'submitted' | 'reviewing' | 'contacted' | 'accepted' | 'rejected';
export type PartnerCategory = 'school' | 'business' | 'scholarship' | 'digital';
export interface InvoiceDetails { recipientName: string; taxCode: string; billingAddress: string; invoiceEmail: string; }
export interface InvoiceFilters { status?: string; startDate?: string; endDate?: string; }
const invoiceParams = (filters: InvoiceFilters) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  return params;
};
export interface SupportTicket { invoiceDetails?: InvoiceDetails | null; orderNumber?: string | null; attachmentSize?: number | null; id: string; ownerId: string; title: string; content: string; requestType?: 'support' | 'invoice'; orderId?: string | null; status: SupportStatus; createdAt: string; updatedAt: string; }
export interface SupportReply { id: string; content: string; isStaff: boolean; createdAt: string; }
export interface SupportDetail extends SupportTicket { replies: SupportReply[]; replyPage: number; replyTotal: number; replyTotalPages: number; }
export interface PartnerApplicationInput { category: PartnerCategory; name: string; organization: string; phone: string; email: string; content: string; consent: boolean; }
export interface PartnerApplication extends Omit<PartnerApplicationInput, 'consent'> { id: string; status: PartnerStatus; createdAt: string; consentAt: string; }
export interface RequestPage<T> { items: T[]; page: number; pageSize: number; total: number; totalPages: number; }
const client = new ApiClient({ getAccessToken: () => getAuthSession()?.accessToken });
const publicClient = new ApiClient();
const supportPath = (admin: boolean) => admin ? '/admin/platform/requests/support' : '/platform/support';

export const platformRequestsService = {
  listInvoices(page = 1, filters: InvoiceFilters = {}) {
    const params = invoiceParams(filters); params.set('page', String(page)); params.set('pageSize', '20'); params.set('requestType', 'invoice');
    return client.get<RequestPage<SupportTicket>>('/platform/support?' + params.toString());
  },
  exportInvoices(filters: InvoiceFilters = {}): Promise<import('./excel-download').ExcelExport> {
    return client.get('/platform/support/invoice-requests/export?' + invoiceParams(filters).toString());
  },
  createInvoice(input: { orderId: string; recipientName: string; taxCode: string; billingAddress: string; invoiceEmail: string }) { return client.post<SupportTicket>('/platform/support/invoice-requests', { ...input }); },
  listSupport(admin: boolean, page: number, status: SupportStatus | '', requestType: '' | 'support' | 'invoice' = '') {
    return client.get<RequestPage<SupportTicket>>(`${supportPath(admin)}?page=${page}&pageSize=20${status ? `&status=${status}` : ''}${requestType ? `&requestType=${requestType}` : ''}`);
  },
  getSupport(admin: boolean, id: string, page: number) {
    return client.get<SupportDetail>(`${supportPath(admin)}/${encodeURIComponent(id)}?page=${page}&pageSize=20`);
  },
  createSupport(input: { title: string; content: string }, image?: File) {
    if (!image) return client.post<SupportTicket>('/platform/support', { ...input });
    const form = new FormData(); form.set('title', input.title); form.set('content', input.content); form.set('image', image);
    return client.post<SupportTicket>('/platform/support', form);
  },
  getSupportImage(admin: boolean, id: string, signal?: AbortSignal) { return client.getBlob(supportPath(admin) + '/' + encodeURIComponent(id) + '/image', { signal }); },
  reply(admin: boolean, id: string, content: string) { return client.post<SupportReply>(`${supportPath(admin)}/${encodeURIComponent(id)}/replies`, { content }); },
  updateSupport(id: string, status: SupportStatus) { return client.patch<SupportTicket>(`${supportPath(true)}/${encodeURIComponent(id)}`, { status }); },
  createPartner(input: PartnerApplicationInput) { return publicClient.post<Pick<PartnerApplication, 'id' | 'status' | 'createdAt'>>('/platform/partner-applications', { ...input }); },
  listPartners(page: number, status: PartnerStatus | '') {
    return client.get<RequestPage<PartnerApplication>>(`/admin/platform/requests/partners?page=${page}&pageSize=20${status ? `&status=${status}` : ''}`);
  },
  updatePartner(id: string, status: PartnerStatus) { return client.patch<PartnerApplication>(`/admin/platform/requests/partners/${encodeURIComponent(id)}`, { status }); },
};
