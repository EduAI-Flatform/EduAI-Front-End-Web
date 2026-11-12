import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PLATFORM_SETTINGS } from '../platform/platform.defaults';
import { AccountSettingsPage } from './AccountSettingsPage';
import { BillingPage } from './BillingPage';
const mocks = vi.hoisted(() => ({ capabilities: vi.fn(), changePassword: vi.fn(), listOrders: vi.fn(), listInvoices: vi.fn(), createInvoice: vi.fn(), setLocale: vi.fn() }));
vi.mock('../../services/account-security.service', () => ({ accountSecurityService: { capabilities: mocks.capabilities, changePassword: mocks.changePassword } }));
vi.mock('../../services/commerce.service', () => ({ commerceService: { listOrders: mocks.listOrders }, formatCommerceMoney: () => '50.000 ₫' }));
vi.mock('../../services/platform-requests.service', () => ({ platformRequestsService: { listInvoices: mocks.listInvoices, createInvoice: mocks.createInvoice } }));
vi.mock('../auth/MfaSettings', () => ({ MfaSettings: () => <section>Authenticator</section> }));
vi.mock('../platform/PlatformProvider', () => ({ usePlatform: () => ({ t: (vi: string) => vi, locale: 'vi', setLocale: mocks.setLocale, settings: { ...DEFAULT_PLATFORM_SETTINGS, operations: { ...DEFAULT_PLATFORM_SETTINGS.operations, invoiceRequestsEnabled: true } } }) }));
describe('GDS account settings and billing', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.capabilities.mockResolvedValue({ passwordMode: 'local', firebaseUid: null });
    mocks.listOrders.mockResolvedValue({ items: [], totalPages: 0 }); mocks.listInvoices.mockResolvedValue({ items: [], totalPages: 0 });
  });
  it('rejects password confirmation mismatch before sending credentials', async () => {
    render(<MemoryRouter><AccountSettingsPage /></MemoryRouter>);
    const current = await screen.findByLabelText('Mật khẩu hiện tại');
    fireEvent.change(current, { target: { value: 'current-password' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'new-password' } });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), { target: { value: 'different-password' } });
    fireEvent.submit(current.closest('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('Mật khẩu xác nhận không khớp.');
    expect(mocks.changePassword).not.toHaveBeenCalled();
    expect(screen.getByText('Authenticator')).toBeInTheDocument();
  });
  it('requests status/date filters from the server and exposes empty invoice history', async () => {
    render(<MemoryRouter><BillingPage /></MemoryRouter>);
    await screen.findByText('Không có đơn hàng phù hợp.');
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'paid' } });
    await waitFor(() => expect(mocks.listOrders).toHaveBeenLastCalledWith(1, 20, { status: 'confirmed', startDate: '', endDate: '' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xuất hóa đơn' }));
    await screen.findByText('Chưa có yêu cầu hóa đơn.');
    expect(mocks.listInvoices).toHaveBeenCalledWith(1);
  });
  it('submits structured invoice details with the selected order identity', async () => {
    mocks.listOrders.mockResolvedValue({ items: [{ id: 'owned-order', orderNumber: 'GDS-1', status: 'CONFIRMED', createdAt: '2026-11-11T00:00:00Z', lines: [{ title: 'Course' }], payable: { currency: 'VND', amountMinor: '50000' } }], totalPages: 1 });
    mocks.createInvoice.mockResolvedValue({ id: 'ticket' });
    render(<MemoryRouter><BillingPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Yêu cầu xuất hóa đơn' }));
    fireEvent.change(screen.getByLabelText('Tên người nhận / tổ chức'), { target: { value: 'School' } });
    fireEvent.change(screen.getByLabelText('Mã số thuế'), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByLabelText('Địa chỉ xuất hóa đơn'), { target: { value: 'School address' } });
    fireEvent.change(screen.getByLabelText('Email nhận hóa đơn'), { target: { value: 'invoice@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));
    await waitFor(() => expect(mocks.createInvoice).toHaveBeenCalledWith({ orderId: 'owned-order', recipientName: 'School', taxCode: '1234567890', billingAddress: 'School address', invoiceEmail: 'invoice@example.test' }));
  });
});
