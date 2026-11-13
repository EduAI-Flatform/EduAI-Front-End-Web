import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CardServiceCatalog } from './CardServiceCatalog';
const api = vi.hoisted(() => ({ createCardServiceDefinition: vi.fn() }));
vi.mock('../../services/platform-settings.service', () => ({ platformSettingsService: api }));
vi.mock('./PlatformProvider', () => ({ usePlatform: () => ({ t: (vi: string, en: string) => en }) }));
const capabilities = { supportedOperations: ['AI_CHAT', 'AI_SUMMARY'], definitions: [], activationReady: false };

function fill() {
  fireEvent.click(screen.getByText('Service catalog'));
  fireEvent.change(screen.getByLabelText('Service operation'), { target: { value: 'AI_CHAT' } });
  fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Support chat' } });
  fireEvent.change(screen.getByLabelText('Reset period'), { target: { value: 'CALENDAR_MONTH' } });
}
describe('Admin request-service catalog', () => {
  it('registers only an explicit supported operation and chosen period, then reloads bindings', async () => {
    api.createCardServiceDefinition.mockResolvedValue({});
    const reload = vi.fn().mockResolvedValue(undefined);
    render(<CardServiceCatalog capabilities={capabilities} onRegistered={reload} />);
    fill(); fireEvent.click(screen.getByRole('button', { name: 'Register service' }));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(api.createCardServiceDefinition).toHaveBeenCalledWith({ code: 'AI_CHAT', displayName: 'Support chat', resetPeriod: 'CALENDAR_MONTH' });
    await screen.findByText('Service registered. Assign quotas in a policy draft before applying them.');
  });
  it('retries only catalog reload after registration succeeded but refresh failed', async () => {
    api.createCardServiceDefinition.mockClear().mockResolvedValue({});
    const reload = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    render(<CardServiceCatalog capabilities={capabilities} onRegistered={reload} />);
    fill(); fireEvent.click(screen.getByRole('button', { name: 'Register service' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Reload service catalog' }));
    await screen.findByText('Service registered. Assign quotas in a policy draft before applying them.');
    expect(api.createCardServiceDefinition).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(2);
  });
  it('does not offer an existing immutable operation for replacement', () => {
    render(<CardServiceCatalog capabilities={{ ...capabilities, definitions: [{ id: 'existing', code: 'AI_CHAT', displayName: 'Existing', valueType: 'metered', resetPeriod: 'calendar_month', unitLabel: 'request', executable: true }] }} onRegistered={vi.fn()} />);
    fireEvent.click(screen.getByText('Service catalog'));
    expect(screen.queryByRole('option', { name: 'AI chat' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'AI summary' })).toBeInTheDocument();
  });
});
