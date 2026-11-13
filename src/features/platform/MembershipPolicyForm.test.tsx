import { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MembershipPolicyForm } from './MembershipPolicyForm';
import { DEFAULT_PLATFORM_SETTINGS } from './platform.defaults';
import type { MembershipPolicyContent } from '../../services/membership-cards.service';
const definition = { id: 'service-one', code: 'AI_CHAT', displayName: 'Chat', valueType: 'metered', resetPeriod: 'calendar_month', unitLabel: 'request', executable: true };
vi.mock('./PlatformProvider', () => ({ usePlatform: () => ({ locale: 'en', t: (vi: string, en?: string) => en ?? vi }) }));
function Editor({ withCatalog = true }: { withCatalog?: boolean }) {
  const [value, setValue] = useState<MembershipPolicyContent>(structuredClone(DEFAULT_PLATFORM_SETTINGS.membership));
  return <><MembershipPolicyForm value={value} onChange={setValue} capabilities={withCatalog ? { definitions: [definition], supportedOperations: ['AI_CHAT'], activationReady: false, schemaReady: true } : undefined} />
    <output data-testid="content">{JSON.stringify(value)}</output></>;
}
describe('membership service quota editor', () => {
  it('does not add defaults to historical content until the user edits it', () => {
    render(<Editor />);
    expect(JSON.parse(screen.getByTestId('content').textContent!)).not.toHaveProperty('serviceLimits');
  });
  it('adds a fourth tier and preserves the original tier configuration', () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole('button', { name: 'Add card tier' }));
    const content = JSON.parse(screen.getByTestId('content').textContent!);
    expect(content.tiers).toHaveLength(4);
    expect(content.tiers[0]).toEqual(DEFAULT_PLATFORM_SETTINGS.membership.tiers[0]);
  });
  it('keeps large quotas as strings and shows the definition reset period', () => {
    render(<Editor />);
    const tier = screen.getByRole('group', { name: 'Member Card' });
    fireEvent.click(within(tier).getByRole('button', { name: 'Add service quota' }));
    fireEvent.change(within(tier).getByRole('combobox', { name: 'Service' }), { target: { value: definition.id } });
    fireEvent.change(within(tier).getByRole('textbox', { name: 'Request quota' }), { target: { value: '9223372036854775807' } });
    expect(JSON.parse(screen.getByTestId('content').textContent!).tiers[0].serviceLimits).toEqual([{ definitionId: definition.id, quota: '9223372036854775807' }]);
    expect(within(tier).getByText('Calendar month (UTC)')).toBeInTheDocument();
  });
  it('does not offer arbitrary service IDs when the server catalog is unavailable', () => {
    render(<Editor withCatalog={false} />);
    for (const button of screen.getAllByRole('button', { name: 'Add service quota' })) expect(button).toBeDisabled();
    expect(screen.getByText('The service catalog is unavailable. Reload before adding a quota.')).toBeInTheDocument();
  });
});
