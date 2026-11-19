import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { GdsWalletActivity } from './GdsWalletActivity';
import { gdsWalletService } from '../../services/gds-wallet.service';
import { apiClient, ApiClientError } from '../../services/api-client';
import { PlatformProvider } from '../platform/PlatformProvider';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); document.documentElement.lang = 'vi'; });
function setup() {
  vi.spyOn(apiClient, 'get').mockResolvedValue({ settings: {} });
  vi.spyOn(gdsWalletService, 'transactions').mockResolvedValue({ items: [{ id: 'row', type: 'TOPUP_CREDIT', amountMinor: '1234', occurredAt: '2030-03-01T00:00:00Z' }], hasMore: false, nextCursor: null });
  return render(<PlatformProvider><GdsWalletActivity /></PlatformProvider>);
}
it('exports the selected full filter through a read API and downloads only a complete workbook', async () => {
  localStorage.setItem('gds.locale.v1', 'en'); setup();
  const button = await screen.findByRole('button', { name: 'Export Excel for this filter' });
  await waitFor(() => expect(button).toBeEnabled());
  const request = vi.spyOn(gdsWalletService as any, 'exportTransactions').mockResolvedValue({ filename: 'gds-transactions-incoming.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dataBase64: btoa('PK\x03\x04fixture'), exported: 1, scope: 'filtered_history', complete: true, filter: 'incoming', asOf: '2030-03-01T00:00:00Z' });
  const create = vi.fn(() => 'blob:synthetic'), revoke = vi.fn();
  vi.stubGlobal('URL', class extends URL { static createObjectURL = create; static revokeObjectURL = revoke; });
  const downloads: string[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { downloads.push(this.download); });
  fireEvent.click(screen.getByRole('button', { name: 'Filter: Incoming funds' }));
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  await waitFor(() => expect(request).toHaveBeenCalledWith('incoming'));
  await waitFor(() => expect(downloads).toEqual(['gds-transactions-incoming.xlsx']));
  expect(revoke).toHaveBeenCalledWith('blob:synthetic');
  expect(screen.getByRole('status')).toHaveTextContent('1');
});

it('shows export-limit feedback without downloading or losing history', async () => {
  setup();
  const button = await screen.findByRole('button', { name: 'Xuất Excel theo bộ lọc này' });
  await waitFor(() => expect(button).toBeEnabled());
  vi.spyOn(gdsWalletService as any, 'exportTransactions').mockRejectedValue(new ApiClientError('limit', 'GDS_HISTORY_EXPORT_LIMIT_EXCEEDED', 400));
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  fireEvent.click(button);
  await expect(screen.findByRole('alert')).resolves.toHaveTextContent('giới hạn');
  expect(click).not.toHaveBeenCalled(); expect(screen.getAllByRole('listitem')).toHaveLength(1);
});

it('does not download a late response after leaving history', async () => {
  const view = setup();
  const button = await screen.findByRole('button', { name: 'Xuất Excel theo bộ lọc này' });
  await waitFor(() => expect(button).toBeEnabled());
  let resolve!: (value: unknown) => void;
  vi.spyOn(gdsWalletService as any, 'exportTransactions').mockReturnValue(new Promise(done => { resolve = done; }));
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  fireEvent.click(button); view.unmount();
  await act(async () => resolve({ complete: true, scope: 'filtered_history', filter: 'all' }));
  expect(click).not.toHaveBeenCalled();
});

it('refuses a partial workbook even when the API call succeeds', async () => {
  setup();
  const button = await screen.findByRole('button', { name: 'Xuất Excel theo bộ lọc này' });
  await waitFor(() => expect(button).toBeEnabled());
  vi.spyOn(gdsWalletService as any, 'exportTransactions').mockResolvedValue({ complete: false, scope: 'filtered_history', filter: 'all' });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  fireEvent.click(button);
  await expect(screen.findByRole('alert')).resolves.toHaveTextContent('Chưa xuất được Excel');
  expect(click).not.toHaveBeenCalled();
});
