import { afterEach, expect, it, vi } from 'vitest';
import { downloadExcel, type ExcelExport } from './excel-download';
const report = (): ExcelExport => ({ filename: 'server.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dataBase64: btoa('PK\x03\x04fixture'), exported: 201, scope: 'filtered_history', complete: true, asOf: '2026-11-20T00:00:00Z' });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('downloads complete results and releases the blob URL', () => {
  const revoke = vi.fn(), create = vi.fn(() => 'blob:test-report');
  vi.stubGlobal('URL', class extends URL { static createObjectURL = create; static revokeObjectURL = revoke; });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  downloadExcel(report(), 'orders.xlsx');
  expect(click).toHaveBeenCalledOnce(); expect(revoke).toHaveBeenCalledWith('blob:test-report');
  expect(document.querySelector('a[download]')).toBeNull();
});
it.each([
  { complete: false }, { scope: 'page' }, { exported: -1 }, { exported: 0.5 },
  { contentType: 'text/html' }, { dataBase64: btoa('<html>error</html>') },
])('rejects an invalid or incomplete report before downloading: %j', override => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  expect(() => downloadExcel({ ...report(), ...override } as ExcelExport, 'orders.xlsx')).toThrow();
  expect(click).not.toHaveBeenCalled();
});
