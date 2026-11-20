export interface ExcelExport {
  filename: string; contentType: string; dataBase64: string; exported: number;
  scope: 'filtered_history'; complete: true; asOf: string;
}

/** Only complete server-owned exports are downloadable. Text cells are encoded server-side. */
export function downloadExcel(file: ExcelExport, filename: string): void {
  if (file.complete !== true || file.scope !== 'filtered_history' ||
      !Number.isSafeInteger(file.exported) || file.exported < 0 ||
      file.contentType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    throw new Error('INVALID_EXCEL_EXPORT');
  }
  const bytes = Uint8Array.from(atob(file.dataBase64), char => char.charCodeAt(0));
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('INVALID_EXCEL_WORKBOOK');
  const url = URL.createObjectURL(new Blob([bytes], { type: file.contentType }));
  const link = document.createElement('a');
  try {
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click();
  } finally { link.remove(); URL.revokeObjectURL(url); }
}
