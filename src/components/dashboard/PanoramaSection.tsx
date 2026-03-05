import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import {
  DollarSign, ShoppingCart, TrendingUp, Activity, Percent, Users,
} from "lucide-react";
import type { SalesRow } from "@/lib/csv-processor";

interface Props {
  data: SalesRow[];
}

const EXCL = ["cancelado", "rechazado"];
const norm = (s: string) => (s || "").trim().toLowerCase();

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const num = (n: number) => n.toLocaleString("es-CO");

interface KPI {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  tip: string;
}

const PanoramaSection = ({ data }: Props) => {
  const metrics = useMemo(() => {
    const active = data.filter((r) => !EXCL.includes(norm(r.estado_actual)));
    const orderIds = new Set(active.map((r) => r.order_id));
    const totalOrdenes = orderIds.size;
    const totalRevenue = active.reduce((s, r) => s + r.pvp_total * r.unidades, 0);
    const aov = totalOrdenes > 0 ? totalRevenue / totalOrdenes : 0;

    const margenRows = active.filter((r) => {
      const v = r.margen_neto;
      return v !== 0 && !isNaN(v) && r.margen_neto !== undefined;
    });
    // also check original string wasn't empty — margen_neto defaults to 0 for empty
    const margenValid = active.filter((r) => {
      const raw = r.margen_neto;
      return raw !== undefined && !isNaN(raw) && raw !== 0;
    });
    const margenProm = margenValid.length > 0
      ? margenValid.reduce((s, r) => s + r.margen_neto, 0) / margenValid.length
      : 0;

    const entregadas = new Set(
      active.filter((r) => norm(r.estado_actual) === "entregado").map((r) => r.order_id)
    );
    const allOrderIds = new Set(data.map((r) => r.order_id));
    const tasaExito = allOrderIds.size > 0 ? (entregadas.size / allOrderIds.size) * 100 : 0;

    const estrellas = new Set(
      active.map((r) => r.estrella_nombre).filter(Boolean)
    ).size;

    return { totalRevenue, totalOrdenes, aov, margenProm, tasaExito, estrellas };
  }, [data]);

  const weekData = useMemo(() => {
    const active = data.filter((r) => !EXCL.includes(norm(r.estado_actual)));
    const map = new Map<number, number>();
    for (const r of active) {
      if (!r.semana_del_anio) continue;
      map.set(r.semana_del_anio, (map.get(r.semana_del_anio) || 0) + r.pvp_total * r.unidades);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([week, revenue]) => ({ week: `S${week}`, revenue }));
  }, [data]);

  const kpis: KPI[] = [
    { label: "Revenue PVP", value: fmt(metrics.totalRevenue), icon: DollarSign, color: "text-success", bg: "bg-success/10", tip: "SUM(PVP × Unidades) excl. cancelados" },
    { label: "Órdenes", value: num(metrics.totalOrdenes), icon: ShoppingCart, color: "text-process", bg: "bg-process/10", tip: "COUNT DISTINCT order_id activas" },
    { label: "AOV", value: fmt(metrics.aov), icon: TrendingUp, color: "text-pending", bg: "bg-pending/10", tip: "Revenue / Órdenes" },
    { label: "Margen Neto Prom.", value: fmt(metrics.margenProm), icon: Activity, color: "text-process", bg: "bg-process/10", tip: "AVG(Margen_Neto_Operativo) en pesos" },
    { label: "Tasa de Éxito", value: `${metrics.tasaExito.toFixed(1)}%`, icon: Percent, color: "text-success", bg: "bg-success/10", tip: "Entregadas / Total órdenes × 100" },
    { label: "Estrellas Activas", value: num(metrics.estrellas), icon: Users, color: "text-pending", bg: "bg-pending/10", tip: "COUNT DISTINCT estrella activas" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight mb-1">Visión General</h2>
        <div className="h-px bg-border" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
        {kpis.map((k) => (
          <TooltipProvider key={k.label} delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="border border-border shadow-sm cursor-default">
                  <CardContent className="px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">
                          {k.label}
                        </p>
                        <p className="text-[22px] font-bold tracking-tight leading-tight mt-0.5">
                          {k.value}
                        </p>
                      </div>
                      <div className={`rounded-md p-1.5 ${k.bg} shrink-0`}>
                        <k.icon className={`h-3.5 w-3.5 ${k.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                {k.tip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {/* Revenue por Semana */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Revenue por Semana</CardTitle>
        </CardHeader>
        <CardContent>
          {weekData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sin datos para este periodo</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={weekData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis
                  tickFormatter={(v: number) => `$${(v / 1e6).toFixed(1)}M`}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <RTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [fmt(v), "Revenue"]}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {weekData.map((_, i) => (
                    <Cell key={i} fill="hsl(270 60% 55%)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PanoramaSection;
