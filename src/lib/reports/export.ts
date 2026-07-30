import "server-only";
import * as XLSX from "xlsx";
import type { ReportTable } from "@/lib/reports/types";

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function metaLines(table: ReportTable): string[][] {
  return [
    [table.title],
    [`Período: ${table.periodLabel}`],
    [`Data de geração: ${table.generatedAt.toLocaleDateString("pt-BR")} ${table.generatedAt.toLocaleTimeString("pt-BR")}`],
    [`Filtros utilizados: ${table.filtersSummary}`],
    [`Moeda: ${table.currency}`],
    [],
  ];
}

export function tableToCsv(table: ReportTable): string {
  const lines: string[] = [];
  for (const row of metaLines(table)) {
    lines.push(row.map(escapeCsvCell).join(","));
  }
  lines.push(table.headers.map(escapeCsvCell).join(","));
  for (const row of table.rows) {
    lines.push(row.map(escapeCsvCell).join(","));
  }
  if (table.totalsRow) {
    lines.push(table.totalsRow.map(escapeCsvCell).join(","));
  }
  return `﻿${lines.join("\r\n")}`;
}

export function tableToXlsxBuffer(table: ReportTable): Buffer {
  const aoa: (string | number)[][] = [
    ...metaLines(table).map((row) => row as (string | number)[]),
    table.headers,
    ...table.rows,
  ];
  if (table.totalsRow) aoa.push(table.totalsRow);

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
