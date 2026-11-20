import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../services/api-client';
import { BillingPage } from './BillingPage';
import { DEFAULT_PLATFORM_SETTINGS } from '../platform/platform.defaults';
const mocks = vi.hoisted(() => ({ orders: vi.fn(), invoices: vi.fn(), exportOrders: vi.fn(), exportInvoices: vi.fn() }));
vi.mock('../../services/commerce.service', () => ({ commerceService: { listOrders: mocks.orders, exportOrders: mocks.exportOrders }, formatCommerceMoney: () => '50.000 đ' }));
vi.mock('../../services/platform-requests.service', () => ({ platformRequestsService: { listInvoices: mocks.invoices, exportInvoices: mocks.exportInvoices } }));
vi.mock('../platform/PlatformProvider', () => ({ usePlatform: () => ({ t: (_vi: string, en: string) => en, locale: 'en', settings: DEFAULT_PLATFORM_SETTINGS }) }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.orders.mockResolvedValue({ items: [], total: 0, totalPages: 0 });
  mocks.invoices.mockResolvedValue({ items: [], total: 0, totalPages: 0 });
});
it('sends cancelled and late-payment states to the server and resets pagination', async () => {
  render(<MemoryRouter initialEntries={['/billing?page=3']}><BillingPage /></MemoryRouter>);
  await waitFor(() => expect(mocks.orders).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: 'Cancelled' }));
  await waitFor(() => expect(mocks.orders).toHaveBeenLastCalledWith(1, 20, { status: 'cancelled', startDate: '', endDate: '' }));
  fireEvent.click(screen.getByRole('button', { name: 'Needs reconciliation' }));
  await waitFor(() => expect(mocks.orders).toHaveBeenLastCalledWith(1, 20, { status: 'late_payment_review', startDate: '', endDate: '' }));
});
it('restores invoice status and date filters from the URL', async () => {
  render(<MemoryRouter initialEntries={['/billing?tab=invoices&status=in_progress&startDate=2026-11-01&endDate=2026-11-20']}><BillingPage /></MemoryRouter>);
  await waitFor(() => expect(mocks.invoices).toHaveBeenLastCalledWith(1, { status: 'in_progress', startDate: '2026-11-01', endDate: '2026-11-20' }));
  expect(screen.getByRole('button', { name: 'In progress' })).toHaveAttribute('aria-pressed', 'true');
});
it('explains why an empty report cannot be exported', async () => {
  render(<MemoryRouter><BillingPage /></MemoryRouter>);
  await screen.findByText('No matching orders.');
  expect(screen.getByRole('button', { name: 'Export Excel' })).toBeDisabled();
  expect(screen.getByText('No records to export for this filter.')).toBeInTheDocument();
});

it.each(['Start date', 'End date'])('returns to page one when %s changes', async label => {
  mocks.orders.mockResolvedValue({ items: [], total: 30, totalPages: 2 });
  render(<MemoryRouter><BillingPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Next' }));
  await waitFor(() => expect(mocks.orders).toHaveBeenLastCalledWith(2, 20, expect.anything()));
  fireEvent.change(screen.getByLabelText(label), { target: { value: '2026-01-01' } });
  await waitFor(() => expect(mocks.orders).toHaveBeenLastCalledWith(1, 20, expect.anything()));
});
it.each([['CANCELLED', 'Cancelled'], ['EXPIRED', 'Expired'], ['LATE_PAYMENT_REVIEW', 'Needs reconciliation'], ['LATE_PAYMENT_REFUNDED', 'Late payment refunded']])('labels %s without changing user content', async (status, label) => {
  mocks.orders.mockResolvedValue({ items: [{ id: 'order', orderNumber: 'Luu', createdAt: '2026-01-01', lines: [{ title: 'Trang thai' }], payable: {}, status }], totalPages: 1 });
  render(<MemoryRouter><BillingPage /></MemoryRouter>);
  await screen.findByText('Trang thai');
  expect(screen.getAllByText(label)).toHaveLength(2);
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function nonempty() { mocks.orders.mockResolvedValue({ items: [{ id: 'order', orderNumber: 'GDS-1', status: 'CONFIRMED', createdAt: '2026-11-01', lines: [{ title: 'Course' }], payable: {} }], total: 90, totalPages: 5 }); }
it('exports the complete server report rather than the visible page', async () => {
  nonempty(); mocks.exportOrders.mockResolvedValue({ complete: true, scope: 'filtered_history', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dataBase64: btoa('PK\x03\x04fixture'), exported: 90 });
  vi.stubGlobal('URL', class extends URL { static createObjectURL = vi.fn(() => 'blob:test'); static revokeObjectURL = vi.fn(); });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  render(<MemoryRouter initialEntries={['/billing?status=confirmed&startDate=2026-11-01']}><BillingPage /></MemoryRouter>);
  await screen.findByText('Course'); fireEvent.click(screen.getByRole('button', { name: 'Export Excel' }));
  await waitFor(() => expect(click).toHaveBeenCalledOnce());
  expect(mocks.exportOrders).toHaveBeenCalledWith({ status: 'confirmed', startDate: '2026-11-01', endDate: '' });
  expect(screen.getByRole('status')).toHaveTextContent('90');
});
it('reports the export limit without losing the list', async () => {
  nonempty(); mocks.exportOrders.mockRejectedValue(new ApiClientError('limit', 'COMMERCE_ORDER_EXPORT_LIMIT_EXCEEDED', 400));
  render(<MemoryRouter><BillingPage /></MemoryRouter>); await screen.findByText('Course');
  fireEvent.click(screen.getByRole('button', { name: 'Export Excel' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('2,000'); expect(screen.getByText('Course')).toBeInTheDocument();
});
it('shows the existing invoice request instead of offering a duplicate', async () => {
  mocks.orders.mockResolvedValue({ items: [{ id: 'order', orderNumber: 'GDS-1', status: 'CONFIRMED', createdAt: '2026-11-01', lines: [{ title: 'Course' }], payable: {}, invoiceRequest: { id: 'ticket', status: 'in_progress' } }], totalPages: 1 });
  render(<MemoryRouter><BillingPage /></MemoryRouter>); await screen.findByText('Course');
  expect(screen.queryByRole('button', { name: 'Request invoice' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Track request' })).toBeInTheDocument();
});
