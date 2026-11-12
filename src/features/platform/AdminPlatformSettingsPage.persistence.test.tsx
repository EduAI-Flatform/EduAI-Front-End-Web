import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminPlatformSettingsPage } from './AdminPlatformSettingsPage';
import { DEFAULT_PLATFORM_SETTINGS } from './platform.defaults';
const api = vi.hoisted(() => ({ state: vi.fn(), create: vi.fn(), preview: vi.fn() }));
vi.mock('../../services/platform-settings.service', () => ({ platformSettingsService: api }));
vi.mock('./PlatformProvider', () => ({ usePlatform: () => ({ locale: 'en', t: (vi: string, en?: string) => en ?? vi }) }));
beforeEach(() => {
  const revisions: unknown[] = [];
  api.state.mockReset().mockImplementation(async () => ({ settings: structuredClone(DEFAULT_PLATFORM_SETTINGS), groups: Object.keys(DEFAULT_PLATFORM_SETTINGS), versions: {}, revisions }));
  api.create.mockReset().mockImplementation(async (group, content) => {
    const row = { id: 'persisted-revision', group, content: Object.fromEntries(Object.entries(content).reverse()), status: 'draft', version: 1, createdAt: new Date().toISOString(), createdById: 'synthetic-admin' };
    revisions.push(row); return row;
  });
  api.preview.mockReset().mockResolvedValue({ revisionId: 'persisted-revision', group: 'points', changed: false, canSchedule: true, blockers: [], preservesPurchasedAccess: true, membershipImpact: null, before: {}, after: {} });
});
describe('Persisted policy JSON comparison', () => {
  it('allows impact preview after persistence reorders object keys without discarding edits', async () => {
    render(<MemoryRouter initialEntries={['/admin/dashboard/platform-settings?group=points']}><AdminPlatformSettingsPage /></MemoryRouter>);
    await userEvent.click(await screen.findByRole('button', { name: 'Save new draft' }));
    const preview = await screen.findByRole('button', { name: 'Preview impact' });
    await waitFor(() => expect(preview).toBeEnabled());
    expect(screen.queryByText('Content changed. Save a new draft before approval.')).not.toBeInTheDocument();
    await userEvent.click(preview);
    await waitFor(() => expect(api.preview).toHaveBeenCalledWith('persisted-revision'));
    const number = screen.getByRole('spinbutton', { name: 'Points validity (months)' });
    await userEvent.clear(number); await userEvent.type(number, '6');
    expect(preview).toBeDisabled();
  });
});
