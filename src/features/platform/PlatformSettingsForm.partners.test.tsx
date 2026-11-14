import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlatformSettingsForm } from './PlatformSettingsForm';
import { withPartnerConnectionDefaults } from './platform.defaults';

describe('partner connection status control', () => {
  it('shows a historical partner as unconfigured without mutating historical policy content', () => {
    const original = { enabled: false, items: [{ name: 'Synthetic', logoUrl: '/gds-logo.png', url: '', category: 'school' }] };
    const before = JSON.stringify(original);
    render(<PlatformSettingsForm field="partners" value={withPartnerConnectionDefaults(original)} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: /Trạng thái kết nối/ })).toHaveValue('unconfigured');
    expect(JSON.stringify(original)).toBe(before);
  });
  it('offers supported connection states independently of application review', () => {
    const onChange = vi.fn();
    render(<PlatformSettingsForm field="connectionStatus" value="unconfigured" onChange={onChange} />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('unconfigured');
    expect(screen.getAllByRole('option').map(option => (option as HTMLOptionElement).value)).toEqual(['unconfigured', 'preparing', 'testing', 'connected', 'suspended']);
    fireEvent.change(select, { target: { value: 'testing' } });
    expect(onChange).toHaveBeenCalledWith('testing');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
