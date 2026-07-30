import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePeriod, PERIOD_KEYS, type PeriodKey } from "@/lib/analytics/period";
import { getPaidOrdersSummary } from "@/lib/analytics/queries";
import { getApplicableAdditionalCosts } from "@/lib/analytics/costs";
import { getProfitEstimate, getProductsMissingCost } from "@/lib/analytics/profit";
import { getProductPerformance } from "@/lib/analytics/products";
import { getAnalyticsThresholds } from "@/lib/analytics/settings";
import { getStockAnalytics } from "@/lib/analytics/stock";
import { getCouponAnalytics } from "@/lib/analytics/coupons";
import { getPromotionAnalytics, getFlashSaleAnalytics } from "@/lib/analytics/promotions";
import { formatCurrency } from "@/lib/utils";
import type { ReportFilters, ReportTable, ReportType } from "@/lib/reports/types";
import type { OrderStatus } from "@/types/database";

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function isPeriodKey(value: string | undefined): value is PeriodKey {
  return !!value && (PERIOD_KEYS as string[]).includes(value);
}

function summarizeFilters(filters: ReportFilters): string {
  const parts: string[] = [];
  if (filters.status) parts.push(`status=${filters.status}`);
  if (filters.produto) parts.push(`produto=${filters.produto}`);
  if (filters.categoria) parts.push(`categoria=${filters.categoria}`);
  if (filters.cliente) parts.push(`cliente=${filters.cliente}`);
  if (filters.cupom) parts.push(`cupom=${filters.cupom}`);
  if (filters.promocao) parts.push(`promoção=${filters.promocao}`);
  if (filters.formaEntrega) parts.push(`entrega=${filters.formaEntrega}`);
  if (filters.valorMinimo) parts.push(`valor mínimo=${filters.valorMinimo}`);
  if (filters.valorMaximo) parts.push(`valor máximo=${filters.valorMaximo}`);
  return parts.length > 0 ? parts.join("; ") : "Nenhum filtro adicional";
}

export async function buildReport(type: ReportType, filters: ReportFilters): Promise<ReportTable> {
  const periodKey: PeriodKey = isPeriodKey(filters.periodo) ? filters.periodo : "last30";
  const period = resolvePeriod(periodKey, filters.de, filters.ate);
  const includeTest = filters.teste === "1" || filters.teste === "true";
  const admin = createAdminClient();

  const base = {
    generatedAt: new Date(),
    periodLabel: `${formatDate(period.range.start.toISOString())} a ${formatDate(new Date(period.range.end.getTime() - 86400000).toISOString())}`,
    filtersSummary: summarizeFilters(filters),
    currency: "BRL",
  };

  switch (type) {
    case "vendas": {
      let query = admin
        .from("orders")
        .select("order_number, created_at, customer_name, subtotal, discount_total, shipping_total, total, payment_status, status")
        .eq("payment_status", "pago")
        .gte("paid_at", period.range.start.toISOString())
        .lt("paid_at", period.range.end.toISOString());
      if (!includeTest) query = query.eq("is_test", false);
      if (filters.status) query = query.eq("status", filters.status as OrderStatus);
      if (filters.valorMinimo) query = query.gte("total", parseFloat(filters.valorMinimo));
      if (filters.valorMaximo) query = query.lte("total", parseFloat(filters.valorMaximo));
      const { data } = await query;

      const rows = (data ?? []).map((o) => [
        o.order_number,
        formatDate(o.created_at),
        o.customer_name,
        formatCurrency(o.subtotal),
        formatCurrency(o.discount_total),
        formatCurrency(o.shipping_total),
        formatCurrency(o.total),
        o.payment_status,
        o.status,
      ]);

      return {
        ...base,
        title: "Relatório de Vendas",
        headers: ["Número do pedido", "Data", "Cliente", "Subtotal", "Desconto", "Entrega", "Total", "Status do pagamento", "Status do pedido"],
        rows,
        totalsRow: ["", "", "Total", "", "", "", formatCurrency((data ?? []).reduce((sum, o) => sum + o.total, 0)), "", ""],
      };
    }

    case "pedidos": {
      let query = admin
        .from("orders")
        .select("order_number, created_at, customer_name, total, payment_status, status")
        .gte("created_at", period.range.start.toISOString())
        .lt("created_at", period.range.end.toISOString());
      if (!includeTest) query = query.eq("is_test", false);
      if (filters.status) query = query.eq("status", filters.status as OrderStatus);
      const { data } = await query;

      return {
        ...base,
        title: "Relatório de Pedidos",
        headers: ["Número do pedido", "Data", "Cliente", "Total", "Status do pagamento", "Status do pedido"],
        rows: (data ?? []).map((o) => [o.order_number, formatDate(o.created_at), o.customer_name, formatCurrency(o.total), o.payment_status, o.status]),
      };
    }

    case "produtos": {
      const rows = await getProductPerformance(period.range, includeTest);
      const { data: products } = await admin.from("products").select("id, sku");
      const skuById = new Map((products ?? []).map((p) => [p.id, p.sku ?? ""]));

      return {
        ...base,
        title: "Relatório de Produtos",
        headers: ["Produto", "Código", "Categoria", "Visualizações", "Carrinhos", "Compras", "Quantidade vendida", "Faturamento", "Estoque", "Conversão"],
        rows: rows.map((p) => [
          p.name,
          skuById.get(p.id) ?? "",
          p.categoryName ?? "",
          p.views,
          p.addToCart,
          p.purchases,
          p.quantitySold,
          formatCurrency(p.revenue),
          p.stock,
          p.conversionRate == null ? "—" : `${p.conversionRate}%`,
        ]),
      };
    }

    case "analytics_produtos": {
      const rows = await getProductPerformance(period.range, includeTest);
      return {
        ...base,
        title: "Relatório de Analytics de Produtos",
        headers: ["Produto", "Visualizações", "Carrinhos", "Checkouts", "Compras", "Quantidade vendida", "Faturamento", "Conversão", "Reembolsado"],
        rows: rows.map((p) => [
          p.name,
          p.views,
          p.addToCart,
          p.beginCheckout,
          p.purchases,
          p.quantitySold,
          formatCurrency(p.revenue),
          p.conversionRate == null ? "—" : `${p.conversionRate}%`,
          formatCurrency(p.refundedAmount),
        ]),
      };
    }

    case "estoque": {
      const thresholds = await getAnalyticsThresholds();
      const summary = await getStockAnalytics(thresholds, includeTest);
      const { data: variants } = await admin.from("product_variants").select("id, sku");
      const skuByVariant = new Map((variants ?? []).map((v) => [v.id, v.sku ?? ""]));
      const { data: products } = await admin.from("products").select("id, sku");
      const skuByProduct = new Map((products ?? []).map((p) => [p.id, p.sku ?? ""]));

      return {
        ...base,
        title: "Relatório de Estoque",
        headers: ["Produto", "Código", "Estoque atual", "Estoque mínimo", "Quantidade vendida (30 dias)", "Status"],
        rows: summary.rows.map((r) => [
          r.name,
          (r.variantId ? skuByVariant.get(r.variantId) : skuByProduct.get(r.productId)) ?? "",
          r.stock,
          thresholds.lowStockQuantity,
          r.soldLast30Days,
          r.status,
        ]),
      };
    }

    case "movimentacoes_estoque": {
      const query = admin
        .from("stock_movements")
        .select("created_at, previous_quantity, changed_quantity, new_quantity, reason, order_number, product_id")
        .gte("created_at", period.range.start.toISOString())
        .lt("created_at", period.range.end.toISOString());
      const { data } = await query;
      const productIds = [...new Set((data ?? []).map((m) => m.product_id))];
      const { data: products } = productIds.length > 0 ? await admin.from("products").select("id, name").in("id", productIds) : { data: [] };
      const nameById = new Map((products ?? []).map((p) => [p.id, p.name]));

      return {
        ...base,
        title: "Relatório de Movimentações de Estoque",
        headers: ["Data", "Produto", "Quantidade anterior", "Alteração", "Quantidade final", "Motivo", "Pedido"],
        rows: (data ?? []).map((m) => [
          formatDate(m.created_at),
          nameById.get(m.product_id) ?? "",
          m.previous_quantity,
          m.changed_quantity,
          m.new_quantity,
          m.reason,
          m.order_number ?? "",
        ]),
      };
    }

    case "clientes": {
      const { data: profiles } = await admin.from("profiles").select("id, full_name, created_at").eq("role", "cliente");
      let paidOrdersQuery = admin.from("orders").select("user_id, total").eq("payment_status", "pago");
      if (!includeTest) paidOrdersQuery = paidOrdersQuery.eq("is_test", false);
      const { data: orders } = await paidOrdersQuery;

      const totalsByUser = new Map<string, { count: number; total: number }>();
      for (const order of orders ?? []) {
        if (!order.user_id) continue;
        const entry = totalsByUser.get(order.user_id) ?? { count: 0, total: 0 };
        entry.count += 1;
        entry.total += order.total;
        totalsByUser.set(order.user_id, entry);
      }

      return {
        ...base,
        title: "Relatório de Clientes",
        headers: ["Cliente", "Cadastro", "Pedidos pagos", "Total gasto"],
        rows: (profiles ?? []).map((p) => {
          const totals = totalsByUser.get(p.id);
          return [p.full_name ?? "", formatDate(p.created_at), totals?.count ?? 0, formatCurrency(totals?.total ?? 0)];
        }),
      };
    }

    case "cupons": {
      const coupons = await getCouponAnalytics(period.range, includeTest);
      return {
        ...base,
        title: "Relatório de Cupons",
        headers: ["Cupom", "Usos", "Clientes", "Faturamento", "Desconto concedido", "Valor médio do pedido", "Status"],
        rows: coupons.map((c) => [c.code, c.uses, c.customersCount, formatCurrency(c.revenue), formatCurrency(c.discountGiven), formatCurrency(c.averageOrderValue), c.isActive ? "Ativo" : "Inativo"]),
      };
    }

    case "promocoes": {
      const promotions = await getPromotionAnalytics(period.range, includeTest);
      return {
        ...base,
        title: "Relatório de Promoções",
        headers: ["Promoção", "Visualizações", "Carrinhos", "Compras", "Quantidade vendida", "Faturamento", "Desconto concedido"],
        rows: promotions.map((p) => [p.name, p.views, p.addToCart, p.purchases, p.quantitySold, formatCurrency(p.revenue), formatCurrency(p.discountGiven)]),
      };
    }

    case "ofertas_relampago": {
      const flashSales = await getFlashSaleAnalytics(includeTest);
      return {
        ...base,
        title: "Relatório de Ofertas Relâmpago",
        headers: ["Produto", "Encerramento", "Visualizações", "Carrinhos", "Compras", "Faturamento", "Estoque restante"],
        rows: flashSales.map((f) => [f.name, formatDate(f.endsAt), f.views, f.addToCart, f.purchases, formatCurrency(f.revenue), f.stockRemaining]),
      };
    }

    case "reembolsos": {
      const query = admin
        .from("refunds")
        .select("created_at, amount, reason, status, order_id, orders(order_number, customer_name)")
        .gte("created_at", period.range.start.toISOString())
        .lt("created_at", period.range.end.toISOString());
      const { data } = await query;

      return {
        ...base,
        title: "Relatório de Reembolsos",
        headers: ["Data", "Pedido", "Cliente", "Valor", "Motivo", "Status"],
        rows: (data ?? []).map((r) => {
          const order = (r as unknown as { orders?: { order_number: string; customer_name: string } | { order_number: string; customer_name: string }[] }).orders;
          const orderInfo = Array.isArray(order) ? order[0] : order;
          return [formatDate(r.created_at), orderInfo?.order_number ?? "", orderInfo?.customer_name ?? "", formatCurrency(r.amount), r.reason ?? "", r.status];
        }),
      };
    }

    case "cancelamentos": {
      let query = admin
        .from("orders")
        .select("order_number, cancelled_at, customer_name, total")
        .eq("status", "cancelado")
        .gte("cancelled_at", period.range.start.toISOString())
        .lt("cancelled_at", period.range.end.toISOString());
      if (!includeTest) query = query.eq("is_test", false);
      const { data } = await query;

      return {
        ...base,
        title: "Relatório de Cancelamentos",
        headers: ["Pedido", "Data do cancelamento", "Cliente", "Valor"],
        rows: (data ?? []).map((o) => [o.order_number, formatDate(o.cancelled_at), o.customer_name, formatCurrency(o.total)]),
      };
    }

    case "lucro_estimado": {
      const summary = await getPaidOrdersSummary(period.range, { includeTest });
      const profit = await getProfitEstimate(period.range, includeTest);
      const additionalCosts = await getApplicableAdditionalCosts(period.range, summary.grossRevenue, summary.paidOrdersCount);
      const missing = await getProductsMissingCost(period.range, includeTest);

      return {
        ...base,
        title: "Relatório de Lucro Estimado",
        headers: ["Item", "Valor"],
        rows: [
          ["Receita de produtos", formatCurrency(profit.productRevenue)],
          ["Custo de produtos", formatCurrency(profit.cogs)],
          ["Descontos", formatCurrency(profit.discountTotal)],
          ["Reembolsos", formatCurrency(profit.refundTotal)],
          ["Custos adicionais", formatCurrency(additionalCosts.total)],
          ["Lucro estimado", formatCurrency(profit.grossProfit)],
          ["Margem estimada", profit.grossMargin == null ? "—" : `${profit.grossMargin}%`],
          ["Produtos sem custo informado", missing.map((m) => m.name).join(", ") || "Nenhum"],
        ],
      };
    }

    default:
      return { ...base, title: "Relatório", headers: [], rows: [] };
  }
}
