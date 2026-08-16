export type ReportType =
  | "pedidos"
  | "vendas"
  | "produtos"
  | "estoque"
  | "clientes"
  | "cupons"
  | "promocoes"
  | "ofertas_relampago"
  | "reembolsos"
  | "cancelamentos"
  | "analytics_produtos"
  | "movimentacoes_estoque"
  | "lucro_estimado";

export const REPORT_TYPES: ReportType[] = [
  "pedidos",
  "vendas",
  "produtos",
  "estoque",
  "clientes",
  "cupons",
  "promocoes",
  "ofertas_relampago",
  "reembolsos",
  "cancelamentos",
  "analytics_produtos",
  "movimentacoes_estoque",
  "lucro_estimado",
];

export interface ReportFilters {
  periodo: string;
  de?: string;
  ate?: string;
  status?: string;
  produto?: string;
  categoria?: string;
  cliente?: string;
  cupom?: string;
  promocao?: string;
  formaEntrega?: string;
  valorMinimo?: string;
  valorMaximo?: string;
  teste?: string;
}

export interface ReportTable {
  title: string;
  generatedAt: Date;
  periodLabel: string;
  filtersSummary: string;
  currency: string;
  headers: string[];
  rows: (string | number)[][];
  totalsRow?: (string | number)[];
}
