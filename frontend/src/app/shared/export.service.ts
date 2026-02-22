import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  exportToExcel(data: Record<string, any>[], columns: string[], fileName: string = 'chatbot-export'): void {
    // Build rows using column order
    const rows = data.map(row => {
      const ordered: Record<string, any> = {};
      columns.forEach(col => {
        ordered[col] = row[col] ?? '';
      });
      return ordered;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    // Auto column widths
    const colWidths = columns.map(col => ({
      wch: Math.max(col.length, ...data.map(row => String(row[col] ?? '').length))
    }));
    worksheet['!cols'] = colWidths;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    XLSX.writeFile(workbook, `${fileName}-${timestamp}.xlsx`);
  }
}
