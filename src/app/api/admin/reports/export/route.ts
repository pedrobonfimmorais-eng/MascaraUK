import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildReport } from "@/lib/reports/build";
import { tableToCsv, tableToXlsxBuffer } from "@/lib/reports/export";
import { REPORT_TYPES, type ReportFilters, type ReportType } from "@/lib/reports/types";

function isReportType(value: string | null): value is ReportType {
  return !!value && (REPORT_TYPES as string[]).includes(value);
}

/**
 * Protected export endpoint: requires an authenticated administrator (same
 * check as every /admin page), validates the report type, and logs the
 * export to admin_logs (type, filters, admin, date) per the security
 * requirements for analytics exports.
 */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const format = url.searchParams.get("format") ?? "csv";

  if (!isReportType(type)) {
    return NextResponse.json({ error: "Tipo de relatório inválido." }, { status: 400 });
  }
  if (format !== "csv" && format !== "xlsx") {
    return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  }

  const filters: ReportFilters = {
    periodo: url.searchParams.get("periodo") ?? "last30",
    de: url.searchParams.get("de") ?? undefined,
    ate: url.searchParams.get("ate") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    produto: url.searchParams.get("produto") ?? undefined,
    categoria: url.searchParams.get("categoria") ?? undefined,
    cliente: url.searchParams.get("cliente") ?? undefined,
    cupom: url.searchParams.get("cupom") ?? undefined,
    promocao: url.searchParams.get("promocao") ?? undefined,
    formaEntrega: url.searchParams.get("formaEntrega") ?? undefined,
    valorMinimo: url.searchParams.get("valorMinimo") ?? undefined,
    valorMaximo: url.searchParams.get("valorMaximo") ?? undefined,
    teste: url.searchParams.get("teste") ?? undefined,
  };

  const table = await buildReport(type, filters);

  const supabaseAdmin = createAdminClient();
  await supabaseAdmin.from("admin_logs").insert({
    admin_id: admin.id,
    action: "relatorio_exportado",
    entity_type: "report",
    details: { type, format, filters },
  });

  const fileNameBase = `${type}_${new Date().toISOString().slice(0, 10)}`;

  if (format === "xlsx") {
    const buffer = new Uint8Array(tableToXlsxBuffer(table));
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileNameBase}.xlsx"`,
      },
    });
  }

  const csv = tableToCsv(table);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileNameBase}.csv"`,
    },
  });
}
