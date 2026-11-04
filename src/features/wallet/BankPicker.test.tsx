import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BankLogo, BankPicker, filterBanks } from './BankPicker';

const banks = [
  { code: 'TPB', bin: '970423', shortName: 'TPBank', name: 'Ngân hàng Tiên Phong', logoUrl: '', verificationSupported: true },
  { code: 'MB', bin: '970422', shortName: 'MBBank', name: 'Ngân hàng Thương mại Quân đội', logoUrl: '', verificationSupported: false },
];
describe('bank catalogue picker', () => {
  it('normalizes spaces, accents and case without hiding substring matches', () => {
    for (const query of ['TP', 'tp bank', 'TPBank', 'tien phong']) expect(filterBanks(banks, query)[0].code).toBe('TPB');
    expect(filterBanks(banks, 'T')).toHaveLength(2);
    expect(filterBanks(banks, '')).toHaveLength(2);
    expect(filterBanks(banks, 'unknown')).toHaveLength(0);
  });
  it('selects with arrows and Enter, closes with Escape, and clears a changed query', () => {
    const change = vi.fn();
    render(<BankPicker banks={banks} value="" onChange={change} />);
    const input = screen.getByRole('combobox', { name: 'Ngân hàng' });
    fireEvent.change(input, { target: { value: 'tp bank' } });
    expect(screen.getByRole('option', { name: /TPBank/ })).toBeVisible();
    fireEvent.keyDown(input, { key: 'ArrowDown' }); fireEvent.keyDown(input, { key: 'Enter' });
    expect(change).toHaveBeenLastCalledWith('TPB');
    fireEvent.focus(input); fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });
  it('shows unsupported banks but only prevents selection under mandatory policy', () => {
    render(<BankPicker banks={banks} value="" onChange={vi.fn()} verificationRequired />);
    fireEvent.focus(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: /MBBank/ })).toHaveAttribute('aria-disabled', 'true');
  });
  it('keeps the bank name readable when the official logo fails', () => {
    const { container } = render(<><BankLogo code="TPB" /><span>TPBank</span></>);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).not.toBeInTheDocument(); expect(screen.getByText('TPBank')).toBeVisible();
  });
});
