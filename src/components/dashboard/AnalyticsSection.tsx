import { useMemo } from "react";
import { type SalesRow } from "@/lib/csv-processor";
import { Progress } from "@/components/ui/progress";

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

const AnalyticsSection = ({ data }: AnalyticsSectionProps) => {
  const active = useMemo(
    () => data.filter((r) => !ESTADOS_EXCLUIDOS.includes(normalize(r.estado_actual))),
    [data]
  );

  // --- Fila 1: Resumen por día ---
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

  // --- Top 5 helpers ---
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
    <div className="flex-1 rounded-lg border border-border bg-card p-4">
      <h4 className="mb-3 text-sm font-semibold text-foreground">{title}</h4>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-2 text-left font-medium text-muted-foreground">{headers[0]}</th>
            <th className="pb-2 text-right font-medium text-muted-foreground">{headers[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0">
              <td className="py-2 text-foreground">{r.name}</td>
              <td className="py-2 text-right font-medium text-foreground">{r.display}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={2} className="py-4 text-center text-muted-foreground">Sin datos</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Fila 1: Resumen por día */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Resumen por Día de la Semana</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-2 text-left font-medium text-muted-foreground w-[120px]">Día</th>
              <th className="pb-2 text-right font-medium text-muted-foreground w-[80px]">Órdenes</th>
              <th className="pb-2 text-right font-medium text-muted-foreground w-[120px]">Revenue PVP</th>
              <th className="pb-2 pl-4 text-left font-medium text-muted-foreground">Proporción</th>
            </tr>
          </thead>
          <tbody>
            {dayStats.rows.map((r) => (
              <tr key={r.day} className="border-b border-border/50 last:border-0">
                <td className="py-2 text-foreground">{r.label}</td>
                <td className="py-2 text-right font-medium text-foreground">{r.orders.toLocaleString()}</td>
                <td className="py-2 text-right font-medium text-foreground">{formatCurrency(r.revenue)}</td>
                <td className="py-2 pl-4">
                  <Progress value={(r.orders / dayStats.maxOrders) * 100} className="h-2" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Fila 2: Top 5 Marcas */}
      <div className="flex flex-col gap-4 md:flex-row">
        {miniTable("Top 5 Marcas por Órdenes", ["Marca", "Órdenes"],
          top5.brandByOrders.map((r) => ({ name: r.name, display: r.count.toLocaleString() }))
        )}
        {miniTable("Top 5 Marcas por Ventas", ["Marca", "Ventas ($)"],
          top5.brandByRevenue.map((r) => ({ name: r.name, display: formatCurrency(r.value) }))
        )}
      </div>

      {/* Fila 3: Top 5 Estrellas */}
      <div className="flex flex-col gap-4 md:flex-row">
        {miniTable("Top 5 Estrellas por Órdenes", ["Estrella", "Órdenes"],
          top5.starByOrders.map((r) => ({ name: r.name, display: r.count.toLocaleString() }))
        )}
        {miniTable("Top 5 Estrellas por Ventas", ["Estrella", "Ventas ($)"],
          top5.starByRevenue.map((r) => ({ name: r.name, display: formatCurrency(r.value) }))
        )}
      </div>
    </div>
  );
};

export default AnalyticsSection;
