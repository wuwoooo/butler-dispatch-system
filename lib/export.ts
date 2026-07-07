import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export async function buildWorkbookBuffer(
  sheets: Array<{
    name: string;
    columns: Array<{ header: string; key: string; width?: number }>;
    rows: Array<Record<string, unknown>>;
  }>
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Codex";
  workbook.created = new Date();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    worksheet.columns = sheet.columns;
    worksheet.addRows(sheet.rows);
    worksheet.getRow(1).font = {
      bold: true
    };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function exportResponse(buffer: Buffer, filename: string) {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    }
  });
}

export function getExportFilename(prefix: string) {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${prefix}-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.xlsx`;
}
