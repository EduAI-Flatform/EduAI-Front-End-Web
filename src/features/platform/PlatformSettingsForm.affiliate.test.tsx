import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlatformSettingsForm } from './PlatformSettingsForm';
const state = vi.hoisted(() => ({ locale: 'vi' }));
vi.mock('./PlatformProvider', () => ({ usePlatform: () => ({ t: (vi: string, en: string) => state.locale === 'en' ? en : vi }) }));
describe('canonical affiliate withdrawal settings', () => {
 it.each(['vi', 'en'])('keeps the legacy value on adjacent edits without offering a second minimum (%s)', locale => {
  state.locale = locale; const onChange = vi.fn();
  render(<PlatformSettingsForm field='affiliate' value={{ minimumWithdrawal: 123456, holdDays: 7 }} onChange={onChange} />);
  expect(screen.queryByRole('spinbutton', { name: locale === 'vi' ? 'Số tiền rút tối thiểu' : 'Minimum withdrawal' })).not.toBeInTheDocument();
  expect(screen.getByText(locale === 'vi' ? /Giá trị cũ được giữ/ : /The legacy value is retained/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: locale === 'vi' ? 'Cấu hình rút tiền GDS' : 'GDS withdrawal settings' })).toHaveAttribute('href', '/admin/dashboard/gds-withdrawals');
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '8' } });
  expect(onChange).toHaveBeenCalledWith({ minimumWithdrawal: 123456, holdDays: 8 });
 });
});

it.each(['vi', 'en'])('uses supported funding choices and preserves fixed seller-first allocation (%s)', locale => {
 state.locale = locale; const onChange = vi.fn();
 render(<PlatformSettingsForm field='affiliate' value={{ fundingSource: 'unconfigured', allocationPrecedence: 'seller_entitlements_first' }} onChange={onChange} />);
 const funding = screen.getByRole('combobox', { name: locale === 'vi' ? 'Nguồn chi hoa hồng' : 'Commission funding source' });
 expect(screen.getAllByRole('combobox')).toHaveLength(1);
 expect(screen.getByRole('option', { name: locale === 'vi' ? 'Chưa cấu hình ghi có vào ví' : 'Wallet credit not configured' })).toHaveValue('unconfigured');
 expect(screen.getByRole('option', { name: locale === 'vi' ? 'Từ phần phí nền tảng' : 'From the platform fee allocation' })).toHaveValue('platform_fee');
 expect(screen.getByText(locale === 'vi' ? /Quyền lợi người bán được bảo toàn/ : /Seller entitlements are preserved/)).toBeInTheDocument();
 fireEvent.change(funding, { target: { value: 'platform_fee' } });
 expect(onChange).toHaveBeenCalledWith({ fundingSource: 'platform_fee', allocationPrecedence: 'seller_entitlements_first' });
});
