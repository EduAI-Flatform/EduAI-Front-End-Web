import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PartnerApplicationPage } from './PartnerApplicationPage';

const flags = vi.hoisted(() => ({ catalog: false, intake: true }));
vi.mock('../platform/PlatformProvider', () => ({ usePlatform: () => ({ locale: 'en', t: (vi: string, en?: string) => en ?? vi,
  settings: { partners: { enabled: flags.catalog, items: [{ name: 'Synthetic School', url: 'https://example.test', logoUrl: '/gds-logo.png', category: 'school' }] },
    operations: { partnerApplicationsEnabled: flags.intake } } }) }));
beforeEach(() => { flags.catalog = false; flags.intake = true; });

describe('public partner catalog visibility', () => {
  it('hides disabled catalog entries without closing independently enabled applications', () => {
    render(<MemoryRouter><PartnerApplicationPage /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: /Synthetic School/ })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Partnership application' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Submit application' })).toBeEnabled();
  });
  it('responds to catalog changes while independently keeping intake closed', () => {
    flags.intake = false;
    const { rerender } = render(<MemoryRouter><PartnerApplicationPage /></MemoryRouter>);
    flags.catalog = true; rerender(<MemoryRouter><PartnerApplicationPage /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Synthetic School/ })).toHaveAttribute('href', 'https://example.test');
    expect(screen.getByRole('button', { name: 'Submit application' })).toBeDisabled();
    flags.catalog = false; rerender(<MemoryRouter><PartnerApplicationPage /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: /Synthetic School/ })).not.toBeInTheDocument();
  });
});
