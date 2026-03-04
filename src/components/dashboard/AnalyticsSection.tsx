import { useMemo } from "react";
import { type SalesRow } from "@/lib/csv-processor";

interface AnalyticsSectionProps {
  data: SalesRow[];
}

const ESTADOS_EXCLUIDOS = ["cancelado", "rechazado"];
const normalize = (s: string) => (s || "").toString().trim().toLowerCase();

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_LABELS: Record<string, string> = {
  Monday: "Lunes", Tuesday: "Martes", Wednesday: "Miércoles",
  Thursday: "Jueves", Friday: "Viernes", Saturday: "Sábado", Sunday: "Domingo",
};

function parseMDY(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-3">
    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{title}</h3>
    <div className="h-px flex-1 bg-border" />
  </div>
);

const AnalyticsSection = ({ data }: AnalyticsSectionProps) => {
  const active = useMemo(
    () => data.filter((r) => !ESTADOS_EXCLUIDOS.includes(normalize(r.estado_actual))),
    [data]
  );

  const dayStats = useMemo(() => {
    const map: Record<string, { orders: Set<string>; revenue: number }> = {};
    for (const day of DAY_ORDER) map[day] = { orders: new Set(), revenue: 0 };

    for (const r of active) {
      const d = parseMDY(r.fecha_creacion_dia);
      if (!d) continue;
      const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
      if (!map[dayName]) continue;
      map[dayName].orders.add(r.order_id);
      map[dayName].revenue += r.pvp_total * r.unidades;
    }

    const rows = DAY_ORDER.map((day) => ({
      day,
      label: DAY_LABELS[day],
      orders: map[day].orders.size,
      revenue: map[day].revenue,
    }));
    const maxOrders = Math.max(...rows.map((r) => r.orders), 1);
    return { rows, maxOrders };
  }, [active]);

  const top5 = useMemo(() => {
    const brandOrders: Record<string, Set<string>> = {};
    const brandRevenue: Record<string, number> = {};
    const starOrders: Record<string, Set<string>> = {};
    const starRevenue: Record<string, number> = {};

    for (const r of active) {
      const b = r.marca;
      const s = r.estrella_nombre;
      if (b) {
        if (!brandOrders[b]) brandOrders[b] = new Set();
        brandOrders[b].add(r.order_id);
        brandRevenue[b] = (brandRevenue[b] || 0) + r.pvp_total * r.unidades;
      }
      if (s) {
        if (!starOrders[s]) starOrders[s] = new Set();
        starOrders[s].add(r.order_id);
        starRevenue[s] = (starRevenue[s] || 0) + r.pvp_total * r.unidades;
      }
    }

    const sortBy = <T,>(obj: Record<string, T>, val: (v: T) => number) =>
      Object.entries(obj).sort((a, b) => val(b[1]) - val(a[1])).slice(0, 5);

    return {
      brandByOrders: sortBy(brandOrders, (s) => s.size).map(([name, s]) => ({ name, count: s.size })),
      brandByRevenue: sortBy(brandRevenue, (v) => v).map(([name, v]) => ({ name, value: v })),
      starByOrders: sortBy(starOrders, (s) => s.size).map(([name, s]) => ({ name, count: s.size })),
      starByRevenue: sortBy(starRevenue, (v) => v).map(([name, v]) => ({ name, value: v })),
    };
  }, [active]);

  const miniTable = (
    title: string,
    headers: [string, string],
    rows: { name: string; display: string }[]
  ) => (
    <div className="flex-1 rounded-lg border border-border bg-card px-3 py-2.5">
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-1.5 text-left font-medium text-muted-foreground">{headers[0]}</th>
            <th className="pb-1.5 text-right font-medium text-muted-foreground">{headers[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0">
              <td className="py-1.5 text-foreground">{r.name}</td>
              <td className="py-1.5 text-right font-medium text-foreground">{r.display}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={2} className="py-3 text-center text-muted-foreground">Sin datos</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Resumen Semanal */}
      <SectionHeader title="Resumen Semanal" />
      <div className="rounded-lg border border-border bg-card px-3 py-2.5">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-1.5 text-left font-medium text-muted-foreground w-[100px]">Día</th>
              <th className="pb-1.5 text-right font-medium text-muted-foreground w-[70px]">Órdenes</th>
              <th className="pb-1.5 text-right font-medium text-muted-foreground w-[110px]">Revenue PVP</th>
              <th className="pb-1.5 pl-3 text-left font-medium text-muted-foreground">Proporción</th>
            </tr>
          </thead>
          <tbody>
            {dayStats.rows.map((r) => {
              const pct = (r.orders / dayStats.maxOrders) * 100;
              return (
                <tr key={r.day} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5 text-foreground font-medium">{r.label}</td>
                  <td className="py-1.5 text-right font-bold text-foreground">{r.orders.toLocaleString()}</td>
                  <td className="py-1.5 text-right font-medium text-foreground">{formatCurrency(r.revenue)}</td>
                  <td className="py-1.5 pl-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[hsl(var(--chart-purple))]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-8 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Top 5 Marcas */}
      <SectionHeader title="Top 5 Marcas" />
      <div className="flex flex-col gap-2 md:flex-row">
        {miniTable("Por Órdenes", ["Marca", "Órdenes"],
          top5.brandByOrders.map((r) => ({ name: r.name, display: r.count.toLocaleString() }))
        )}
        {miniTable("Por Revenue", ["Marca", "Revenue"],
          top5.brandByRevenue.map((r) => ({ name: r.name, display: formatCurrency(r.value) }))
        )}
      </div>

      {/* Top 5 Estrellas */}
      <SectionHeader title="Top 5 Estrellas" />
      <div className="flex flex-col gap-2 md:flex-row">
        {miniTable("Por Órdenes", ["Estrella", "Órdenes"],
          top5.starByOrders.map((r) => ({ name: r.name, display: r.count.toLocaleString() }))
        )}
        {miniTable("Por Revenue", ["Estrella", "Revenue"],
          top5.starByRevenue.map((r) => ({ name: r.name, display: formatCurrency(r.value) }))
        )}
      </div>
    </div>
  );
};

export default AnalyticsSection;
