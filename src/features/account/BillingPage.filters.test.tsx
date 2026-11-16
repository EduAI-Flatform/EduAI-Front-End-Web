import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PlatformProvider } from '../platform/PlatformProvider';
import { BillingPage } from './BillingPage';
const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('../../services/commerce.service', () => ({ commerceService: { listOrders: mocks.list }, formatCommerceMoney: () => '100 VND' }));
vi.mock('../../services/api-client', () => ({ apiClient: { get: vi.fn().mockResolvedValue({ settings: {} }) } }));
vi.mock('../../services/platform-requests.service', () => ({ platformRequestsService: { listInvoices: vi.fn() } }));
function show() { return render(<PlatformProvider><MemoryRouter><BillingPage /></MemoryRouter></PlatformProvider>); }
beforeEach(() => { localStorage.setItem('gds.locale.v1', 'en'); mocks.list.mockReset(); mocks.list.mockResolvedValue({ items: [], totalPages: 2 }); });
describe('billing filters', () => {
  it.each(['Status', 'Start date', 'End date'])('returns to page one when %s changes', async label => {
    show(); await screen.findByRole('button', { name: 'Next' });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(2, 20, expect.anything()));
    fireEvent.change(screen.getByLabelText(label), { target: { value: label === 'Status' ? 'paid' : '2026-01-01' } });
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(1, 20, expect.anything()));
  });
  it.each([['CANCELLED', 'Cancelled'], ['EXPIRED', 'Expired'], ['LATE_PAYMENT_REVIEW', 'Late payment under review'], ['LATE_PAYMENT_REFUNDED', 'Late payment refunded']])('labels %s without changing order content', async (status, label) => {
    mocks.list.mockResolvedValue({ items: [{ id: 'order', orderNumber: 'Luu', createdAt: '2026-01-01', lines: [{ title: 'Trang thai' }], payable: {}, status }], totalPages: 1 });
    show(); expect(await screen.findByText(label)).toBeInTheDocument(); expect(screen.getByText('Trang thai')).toBeInTheDocument();
  });
});
