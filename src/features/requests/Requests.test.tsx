import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SupportPage } from './SupportPage';
import { PartnerApplicationPage } from './PartnerApplicationPage';

const context = vi.hoisted(() => ({ enabled: true }));
const service = vi.hoisted(() => ({ listSupport: vi.fn(), getSupport: vi.fn(), getSupportImage: vi.fn(), createSupport: vi.fn(), reply: vi.fn(), updateSupport: vi.fn(), createPartner: vi.fn(), listPartners: vi.fn(), updatePartner: vi.fn() }));
vi.mock('../platform/PlatformProvider', () => ({ usePlatform: () => ({ t: (vi: string) => vi, locale: 'vi', settings: { operations: { supportEnabled: context.enabled, partnerApplicationsEnabled: context.enabled }, partners: { items: [] } } }) }));
vi.mock('../../services/platform-requests.service', () => ({ platformRequestsService: service }));
const ticket = { id: 'ticket-1', title: 'Cần hỗ trợ', content: 'Nội dung yêu cầu', status: 'open', createdAt: '2026-11-11T00:00:00Z', updatedAt: '2026-11-11T00:00:00Z', ownerId: 'owner-1' };

beforeEach(() => {
  context.enabled = true;
  URL.createObjectURL = vi.fn(() => 'blob:private-image'); URL.revokeObjectURL = vi.fn();
  Object.values(service).forEach(mock => mock.mockReset());
  service.listSupport.mockResolvedValue({ items: [], page: 1, totalPages: 0, total: 0, pageSize: 20 });
  service.getSupport.mockResolvedValue({ ...ticket, replies: [], replyPage: 1, replyTotal: 0, replyTotalPages: 0 });
});

describe('support requests', () => {
  it('keeps existing requests readable when new intake is disabled', async () => {
    context.enabled = false;
    service.listSupport.mockResolvedValue({ items: [ticket], page: 1, totalPages: 1, total: 1, pageSize: 20 });
    render(<SupportPage />);
    expect(screen.getByRole('button', { name: 'Tạo yêu cầu' })).toBeDisabled();
    expect(await screen.findByText('Cần hỗ trợ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xem yêu cầu: Cần hỗ trợ' })).toBeEnabled();
  });
  it('offers retry after a load error', async () => {
    service.listSupport.mockRejectedValueOnce(new Error('offline'));
    render(<SupportPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được yêu cầu');
    await userEvent.click(screen.getByRole('button', { name: 'Tải lại' }));
    expect(await screen.findByText('Bạn chưa có yêu cầu nào.')).toBeInTheDocument();
  });
  it('submits only title and content through the accessible create dialog', async () => {
    service.createSupport.mockResolvedValue(ticket);
    render(<SupportPage />);
    await screen.findByText('Bạn chưa có yêu cầu nào.');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo yêu cầu' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Tiêu đề'), { target: { value: '  Cần hỗ trợ  ' } });
    fireEvent.change(within(dialog).getByLabelText('Nội dung'), { target: { value: '  Nội dung yêu cầu  ' } });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi yêu cầu' }));
    await waitFor(() => expect(service.createSupport).toHaveBeenCalledWith({ title: 'Cần hỗ trợ', content: 'Nội dung yêu cầu' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
  it('previews and submits a screenshot, then releases its object URL', async () => {
    service.createSupport.mockResolvedValue(ticket); const view = render(<SupportPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Tạo yêu cầu' }));
    const dialog = screen.getByRole('dialog');
    const file = new File(['synthetic'], 'screenshot.png', { type: 'image/png' });
    await userEvent.upload(within(dialog).getByLabelText('Ảnh đính kèm (tùy chọn)'), file);
    expect(await within(dialog).findByAltText('Xem trước ảnh đính kèm')).toHaveAttribute('src', 'blob:private-image');
    fireEvent.change(within(dialog).getByLabelText('Tiêu đề'), { target: { value: 'Cần hỗ trợ' } });
    fireEvent.change(within(dialog).getByLabelText('Nội dung'), { target: { value: 'Nội dung yêu cầu' } });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi yêu cầu' }));
    await waitFor(() => expect(service.createSupport).toHaveBeenCalledWith({ title: 'Cần hỗ trợ', content: 'Nội dung yêu cầu' }, file));
    view.unmount(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private-image');
  });
  it('loads screenshots through the authenticated service and releases URLs when closed', async () => {
    service.listSupport.mockResolvedValue({ items: [ticket], page: 1, totalPages: 1 });
    service.getSupport.mockResolvedValue({ ...ticket, attachmentSize: 20, replies: [], replyTotalPages: 0 });
    service.getSupportImage.mockResolvedValue(new Blob(['synthetic'], { type: 'image/png' }));
    const view = render(<SupportPage admin />);
    await userEvent.click(await screen.findByRole('button', { name: 'Xem yêu cầu: Cần hỗ trợ' }));
    expect(await screen.findByAltText('Ảnh đính kèm yêu cầu hỗ trợ')).toHaveAttribute('src', 'blob:private-image');
    expect(service.getSupportImage).toHaveBeenCalledWith(true, 'ticket-1', expect.any(AbortSignal));
    view.unmount(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private-image');
  });
  it('rejects oversized screenshots before submitting', async () => {
    render(<SupportPage />); await userEvent.click(screen.getByRole('button', { name: 'Tạo yêu cầu' }));
    const file = new File([new Uint8Array(6 * 1024 * 1024)], 'too-big.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Ảnh đính kèm (tùy chọn)'), file);
    expect(await screen.findByRole('alert')).toHaveTextContent('giới hạn dung lượng');
    expect(screen.queryByAltText('Xem trước ảnh đính kèm')).not.toBeInTheDocument();
    expect(service.createSupport).not.toHaveBeenCalled();
  });
  it('preserves the typed reply when saving fails', async () => {
    service.listSupport.mockResolvedValue({ items: [ticket], page: 1, totalPages: 1, total: 1, pageSize: 20 });
    service.reply.mockRejectedValue(new Error('offline'));
    render(<SupportPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Xem yêu cầu: Cần hỗ trợ' }));
    const reply = await screen.findByLabelText('Phản hồi');
    fireEvent.change(reply, { target: { value: 'Thông tin bổ sung' } });
    await userEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa lưu được thay đổi');
    expect(reply).toHaveValue('Thông tin bổ sung');
  });
});

describe('partner applications', () => {
  it('does not accept contact details when intake is disabled', () => {
    context.enabled = false;
    render(<MemoryRouter><PartnerApplicationPage /></MemoryRouter>);
    expect(screen.getByLabelText('Họ tên')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Gửi đăng ký' })).toBeDisabled();
    expect(service.createPartner).not.toHaveBeenCalled();
  });
  it('submits contact details and explicit consent then shows the returned reference', async () => {
    service.createPartner.mockResolvedValue({ id: 'application-reference', status: 'submitted' });
    render(<MemoryRouter><PartnerApplicationPage /></MemoryRouter>);
    for (const [label, value] of Object.entries({ 'Họ tên': 'Synthetic User', 'Tổ chức': 'Synthetic School', 'Số điện thoại liên hệ': '0901234567', Email: 'synthetic@example.test', 'Nội dung': 'Synthetic partnership proposal' })) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Gửi đăng ký' }));
    await waitFor(() => expect(service.createPartner).toHaveBeenCalledWith(expect.objectContaining({ category: 'school', consent: true, email: 'synthetic@example.test' })));
    expect(await screen.findByText('application-reference')).toBeInTheDocument();
  });
});
