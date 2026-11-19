import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PlatformProvider, usePlatform } from '../../platform/PlatformProvider';
import { AdminCommercePage } from './AdminCommercePage';
import { RefundOperations } from './RefundOperations';
import { PaymentCheckout } from '../../payments/PaymentCheckout';

const api = vi.hoisted(() => ({ listCatalog: vi.fn(), listOrders: vi.fn(), getOrder: vi.fn(), listPaymentReviews: vi.fn(), listRefunds: vi.fn(), runPaymentExpiry: vi.fn(), rejectRefund: vi.fn(), createRefund: vi.fn() }));
const payment = vi.hoisted(() => ({ cancel: vi.fn(), status: vi.fn() }));
vi.mock('../../../services/admin-commerce.service', async original => ({ ...(await original<typeof import('../../../services/admin-commerce.service')>()), adminCommerceService: api }));
vi.mock('../../../services/api-client', async original => ({ ...(await original<typeof import('../../../services/api-client')>()), apiClient: { get: vi.fn().mockResolvedValue({ settings: {} }) } }));
vi.mock('../../../services/payment.service', async original => ({ ...(await original<typeof import('../../../services/payment.service')>()), paymentService: payment }));
function Switch() { const { locale, setLocale } = usePlatform(); return <button onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}>Switch</button>; }
const order = { id: 'order', orderNumber: 'Authored Order', status: 'CONFIRMED', paymentStatus: 'PAID', fulfillmentStatus: 'FULFILLED', payableAmountMinor: '9007199254740993', currency: 'VND', createdAt: '2030-01-01', pricingPolicyVersion: 'policy-id', buyer: { fullName: 'Authored Buyer', email: 'authored@example.test' },
  lines: [{ id: 'line', productType: 'COURSE', displayTitle: 'Authored title', finalAmountMinor: '9007199254740993', unitListPriceAmountMinor: '9007199254740993', discountAmountMinor: '0', currency: 'VND' }],
  paymentAttempts: [{ id: 'attempt', status: 'PAID', amountMinor: '9007199254740993', currency: 'VND', createdAt: '2030-01-01' }],
  settlements: [{ id: 'settlement', kind: 'PROVIDER_COLLECTION', disposition: 'MATCHED', amountMinor: '9007199254740993', currency: 'VND', recordedAt: '2030-01-01' }],
  lifecycle: [{ id: 'event', previousStatus: 'PENDING_PAYMENT', nextStatus: 'CONFIRMED', actorKind: 'PROVIDER', reasonCode: 'AUTHORED_REASON', occurredAt: '2030-01-01' }] };
const refund = { id: 'refund', status: 'REQUESTED', amountMinor: '1234', currency: 'VND', reasonCode: 'AUTHORED_REASON', updatedAt: '2030-01-01', order: { orderNumber: 'Authored Order' }, requestedBy: { fullName: 'Authored requester' }, recordedBy: null, recordedAt: null, externalReference: null, rejectionReasonCode: null,
  allocations: [{ orderLineId: 'line', productType: 'COURSE', displayTitle: 'Authored title', amountMinor: '1234', currency: 'VND' }] };
beforeEach(() => {
  localStorage.clear(); document.documentElement.lang = 'vi'; vi.clearAllMocks();
  api.listCatalog.mockResolvedValue({ items: [], total: 0 }); api.listOrders.mockResolvedValue({ items: [order], total: 1, page: 1, totalPages: 1 }); api.getOrder.mockResolvedValue(order);
  api.listRefunds.mockResolvedValue({ items: [refund], total: 1, page: 1, totalPages: 1 });
});
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); document.documentElement.lang = 'vi'; });
const toggle = () => fireEvent.click(screen.getByRole('button', { name: 'Switch' }));

it.each([
  ['DRAFT', 'PRIVATE', 'CLEAR', 'Bản nháp · Riêng tư · Không có cảnh báo', 'Draft · Private · Clear'],
  ['PUBLISHED', 'PUBLIC', 'HIDDEN', 'Đã xuất bản · Công khai · Đã ẩn', 'Published · Public · Hidden'],
  ['ARCHIVED', 'PRIVATE', 'REJECTED', 'Đã lưu trữ · Riêng tư · Đã từ chối', 'Archived · Private · Rejected'],
  ['PUBLISHED', 'PRIVATE', 'ARCHIVED', 'Đã xuất bản · Riêng tư · Đã lưu trữ', 'Published · Private · Archived'],
])('relocalizes catalog metadata %s/%s/%s without translating the course title', async (status, visibility, moderationStatus, viLabel, enLabel) => {
  api.listCatalog.mockResolvedValue({ items: [{ id: 'course', title: 'Authored course', instructor: { fullName: 'Authored instructor' }, status, visibility, moderationStatus, priceAmountMinor: '1234', priceCurrency: 'VND', updatedAt: '2030-01-01', product: null }], total: 1, page: 1, totalPages: 1 });
  const { container } = render(<PlatformProvider><Switch /><AdminCommercePage /></PlatformProvider>);
  fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa Authored course' }));
  for (const locale of ['vi', 'en', 'vi']) {
    if (locale === 'en' || document.documentElement.lang === 'en') toggle();
    expect(container.querySelector('.admin-commerce-course-summary > span')).toHaveTextContent(locale === 'vi' ? viLabel : enLabel);
    expect(container.querySelector('.admin-commerce-course-summary > strong')).toHaveTextContent('Authored course');
  }
});

it('updates order/payment/settlement/lifecycle labels without changing authored values', async () => {
  render(<PlatformProvider><Switch /><AdminCommercePage /></PlatformProvider>);
  fireEvent.click(screen.getByRole('tab', { name: 'Đơn hàng' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Xem đơn Authored Order' }));
  await screen.findByRole('heading', { name: 'Authored Order' });
  for (const locale of ['vi', 'en', 'vi']) {
    if (locale === 'en' || document.documentElement.lang === 'en') toggle();
    const detail = screen.getByRole('region', { name: locale === 'vi' ? 'Chi tiết đơn hàng' : 'Order details' });
    expect(within(detail).getAllByText(locale === 'vi' ? 'Đã xác nhận' : 'Confirmed').length).toBeGreaterThan(0);
    expect(detail).toHaveTextContent(locale === 'vi' ? 'Đã thanh toán' : 'Paid');
    expect(detail).toHaveTextContent(locale === 'vi' ? 'Đã cấp quyền' : 'Fulfilled');
    expect(detail).toHaveTextContent(locale === 'vi' ? 'Thu qua nhà cung cấp' : 'Provider collection');
    expect(detail).toHaveTextContent('Authored Buyer'); expect(detail).toHaveTextContent('Authored title'); expect(detail).toHaveTextContent('AUTHORED_REASON');
  }
});

it('updates refund labels and confirmation prompts without actions when declined', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  render(<PlatformProvider><Switch /><RefundOperations /></PlatformProvider>);
  fireEvent.click(await screen.findByRole('button', { name: /Authored Order/ }));
  for (const locale of ['vi', 'en', 'vi']) {
    if (locale === 'en' || document.documentElement.lang === 'en') toggle();
    const detail = screen.getByRole('region', { name: locale === 'vi' ? 'Chi tiết hoàn tiền' : 'Refund detail' });
    expect(detail).toHaveTextContent(locale === 'vi' ? 'Đã yêu cầu' : 'Requested');
    expect(detail).toHaveTextContent(locale === 'vi' ? 'Khóa học' : 'Course');
    expect(detail).toHaveTextContent(locale === 'vi' ? 'Chưa ghi nhận' : 'Not recorded');
    fireEvent.click(screen.getByRole('button', { name: locale === 'vi' ? 'Kiểm tra thanh toán đến hạn' : 'Check due payments' }));
    expect(confirm).toHaveBeenLastCalledWith(locale === 'vi' ? 'Kiểm tra các yêu cầu thanh toán đã đến hạn?' : 'Check payment requests that are due?');
    fireEvent.click(screen.getByRole('button', { name: locale === 'vi' ? 'Từ chối yêu cầu' : 'Reject request' }));
    expect(confirm).toHaveBeenLastCalledWith(locale === 'vi' ? 'Từ chối yêu cầu hoàn tiền với lý do đã nhập?' : 'Reject the refund request with the entered reason?');
    expect(detail).toHaveTextContent('AUTHORED_REASON'); expect(detail).toHaveTextContent('Authored title');
  }
  expect(api.runPaymentExpiry).not.toHaveBeenCalled(); expect(api.rejectRefund).not.toHaveBeenCalled();
});

it('localizes payment cancellation confirmation and preserves the declined-action boundary', () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  render(<PlatformProvider><Switch /><PaymentCheckout initial={{ orderId: 'order', orderNumber: 'Authored Order', orderStatus: 'PENDING_PAYMENT', paymentRequired: true, payment: { id: 'attempt', status: 'PENDING', provider: 'payos', amount: { amountMinor: '1234', currency: 'VND' }, expiresAt: '2035-01-01', qrCodeDataUrl: 'data:image/png;base64,ZmFrZQ==' } }} /></PlatformProvider>);
  for (const locale of ['vi', 'en', 'vi']) {
    if (locale === 'en' || document.documentElement.lang === 'en') toggle();
    fireEvent.click(screen.getByRole('button', { name: locale === 'vi' ? 'Hủy yêu cầu thanh toán' : 'Cancel payment request' }));
    expect(confirm).toHaveBeenLastCalledWith(locale === 'vi' ? 'Bạn có chắc muốn hủy yêu cầu thanh toán này?' : 'Are you sure you want to cancel this payment request?');
  }
  expect(payment.cancel).not.toHaveBeenCalled();
});

it('updates review kinds, order states and missing-check fallback while keeping technical reason codes', async () => {
  api.listPaymentReviews.mockResolvedValue({ items: [{ id: 'review', kind: 'PROVIDER_OUTAGE', reasonCode: 'AUTHORED_REASON', status: 'OPEN', checkCount: 1, lastCheckedAt: null, order: { orderNumber: 'Authored Order', status: 'PENDING_PAYMENT', fulfillmentStatus: 'NOT_STARTED', payableAmountMinor: '1234', currency: 'VND' } }], total: 1, page: 1, totalPages: 1 });
  render(<PlatformProvider><Switch /><AdminCommercePage /></PlatformProvider>);
  fireEvent.click(screen.getByRole('tab', { name: 'Đối soát' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Kiểm tra đơn Authored Order' }));
  for (const locale of ['vi', 'en', 'vi']) {
    if (locale === 'en' || document.documentElement.lang === 'en') toggle();
    const detail = screen.getByRole('region', { name: locale === 'vi' ? 'Chi tiết kiểm tra thanh toán' : 'Payment review detail' });
    expect(detail).toHaveTextContent(locale === 'vi' ? 'Nhà cung cấp gián đoạn' : 'Provider outage');
    expect(detail).toHaveTextContent(locale === 'vi' ? 'Chờ thanh toán' : 'Pending payment');
    expect(detail).toHaveTextContent(locale === 'vi' ? 'Chưa bắt đầu' : 'Not started');
    expect(detail).toHaveTextContent(locale === 'vi' ? 'Chưa kiểm tra' : 'Not checked');
    expect(detail).toHaveTextContent('AUTHORED_REASON');
    expect(screen.getByRole('button', { name: `${locale === 'vi' ? 'Kiểm tra đơn' : 'Review'} Authored Order` })).toBeInTheDocument();
  }
});

it('localizes manual refund confirmation without creating a request when declined', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  render(<PlatformProvider><Switch /><AdminCommercePage /></PlatformProvider>);
  fireEvent.click(screen.getByRole('tab', { name: 'Đơn hàng' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Xem đơn Authored Order' }));
  await screen.findByRole('heading', { name: 'Authored Order' });
  for (const locale of ['vi', 'en', 'vi']) {
    if (locale === 'en' || document.documentElement.lang === 'en') toggle();
    const input = screen.getByLabelText(`Authored title ${locale === 'vi' ? 'phân bổ hoàn tiền' : 'refund allocation'}`);
    fireEvent.change(input, { target: { value: '1234' } }); fireEvent.submit(input.closest('form')!);
    expect(confirm).toHaveBeenLastCalledWith(locale === 'vi' ? 'Tạo yêu cầu hoàn tiền thủ công cho 1234 VND? Chưa thực hiện chuyển tiền.' : 'Create a manual refund request for 1234 VND? No payout will be initiated.');
  }
  expect(api.createRefund).not.toHaveBeenCalled();
});

it('relocalizes manual refund validation and success notices without changing the request payload', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true); api.createRefund.mockResolvedValue({ id: 'refund' });
  render(<PlatformProvider><Switch /><AdminCommercePage /></PlatformProvider>);
  fireEvent.click(screen.getByRole('tab', { name: 'Đơn hàng' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Xem đơn Authored Order' }));
  await screen.findByRole('heading', { name: 'Authored Order' });
  const input = screen.getByLabelText('Authored title phân bổ hoàn tiền');
  fireEvent.submit(input.closest('form')!);
  expect(screen.getByRole('status')).toHaveTextContent('Nhập ít nhất một khoản phân bổ dương.');
  toggle(); expect(screen.getByRole('status')).toHaveTextContent('Enter at least one positive line allocation.');
  fireEvent.change(input, { target: { value: '1234' } }); fireEvent.submit(input.closest('form')!);
  await screen.findByText('Refund request created. Complete or reject it in the Refunds tab.');
  toggle(); expect(screen.getByRole('status')).toHaveTextContent('Đã tạo yêu cầu hoàn tiền. Hoàn tất hoặc từ chối trong thẻ Hoàn tiền.');
  expect(api.createRefund).toHaveBeenCalledWith({ settlementId: 'settlement', amountMinor: '1234', reasonCode: 'CUSTOMER_REQUEST', allocations: [{ orderLineId: 'line', amountMinor: '1234' }] });
});
