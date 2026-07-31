"use client";

import { useMemo, useRef, useState } from "react";
import { t } from "@/i18n";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
  isCurrency?: boolean;
}

interface AnalyticsChartProps {
  labels: string[];
  series: ChartSeries[];
  height?: number;
}

const WIDTH = 720;

/**
 * Minimal dependency-free SVG line chart: hover tooltip, a legend that
 * toggles series on/off, and a "exportar imagem" button that rasterizes the
 * SVG to PNG via canvas. No animation libraries, per "gráficos simples e
 * legíveis... não use animações excessivas".
 */
export function AnalyticsChart({ labels, series, height = 260 }: AnalyticsChartProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const visibleSeries = series.filter((s) => !hiddenSeries.has(s.key));
  const allValues = visibleSeries.flatMap((s) => s.values);
  const maxValue = Math.max(1, ...allValues);
  const hasAnyData = allValues.some((v) => v > 0);

  const paddingLeft = 8;
  const paddingRight = 8;
  const paddingTop = 10;
  const paddingBottom = 24;
  const chartWidth = WIDTH - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const pointsBySeries = useMemo(() => {
    return visibleSeries.map((s) => {
      const points = s.values.map((value, index) => {
        const x = labels.length > 1 ? paddingLeft + (index / (labels.length - 1)) * chartWidth : paddingLeft;
        const y = paddingTop + chartHeight - (value / maxValue) * chartHeight;
        return { x, y, value };
      });
      return { ...s, points };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleSeries, labels.length, maxValue]);

  function toggleSeries(key: string) {
    setHiddenSeries((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleExportImage() {
    const svg = svgRef.current;
    if (!svg) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = WIDTH;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);
        const link = document.createElement("a");
        link.download = "grafico.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }

  if (!hasAnyData) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500">
        {t("analytics.noDataInPeriod")}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        {series.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => toggleSeries(s.key)}
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ opacity: hiddenSeries.has(s.key) ? 0.4 : 1 }}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </button>
        ))}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={handleExportImage}>
          {t("analytics.exportImage")}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${height}`}
          width="100%"
          height={height}
          className="min-w-[480px]"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <line x1={paddingLeft} y1={paddingTop + chartHeight} x2={WIDTH - paddingRight} y2={paddingTop + chartHeight} stroke="#e5e7eb" />

          {pointsBySeries.map((s) => (
            <polyline
              key={s.key}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              points={s.points.map((p) => `${p.x},${p.y}`).join(" ")}
            />
          ))}

          {labels.map((_, index) => {
            const x = labels.length > 1 ? paddingLeft + (index / (labels.length - 1)) * chartWidth : paddingLeft;
            return (
              <rect
                key={index}
                x={x - chartWidth / labels.length / 2}
                y={0}
                width={Math.max(4, chartWidth / labels.length)}
                height={height}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(index)}
              />
            );
          })}

          {hoverIndex != null &&
            pointsBySeries.map((s) => (
              <circle key={s.key} cx={s.points[hoverIndex]?.x} cy={s.points[hoverIndex]?.y} r={3.5} fill={s.color} />
            ))}

          {hoverIndex != null && (
            <line
              x1={pointsBySeries[0]?.points[hoverIndex]?.x ?? 0}
              y1={paddingTop}
              x2={pointsBySeries[0]?.points[hoverIndex]?.x ?? 0}
              y2={paddingTop + chartHeight}
              stroke="#d1d5db"
              strokeDasharray="3 3"
            />
          )}

          <text x={paddingLeft} y={height - 6} fontSize="10" fill="#9ca3af">
            {labels[0]}
          </text>
          <text x={WIDTH - paddingRight} y={height - 6} fontSize="10" fill="#9ca3af" textAnchor="end">
            {labels[labels.length - 1]}
          </text>
        </svg>
      </div>

      {hoverIndex != null && (
        <div className="mt-1 rounded-lg border border-gray-200 bg-white p-2 text-xs shadow-sm">
          <p className="mb-1 font-medium text-brand-secondary">{labels[hoverIndex]}</p>
          {pointsBySeries.map((s) => (
            <p key={s.key} className="flex justify-between gap-4" style={{ color: s.color }}>
              <span>{s.label}</span>
              <span>{s.isCurrency ? formatCurrency(s.points[hoverIndex]?.value ?? 0) : s.points[hoverIndex]?.value ?? 0}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
