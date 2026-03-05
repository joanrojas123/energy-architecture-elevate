import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Percent,
  Star,
  PieChart,
} from "lucide-react";
import type { SalesRow } from "@/lib/csv-processor";

interface PanoramaSectionProps {
  data: SalesRow[];
}

const EXCLUIDOS = ["cancelado", "rechazado"];
const norm = (s: string) => (s || "").trim().toLowerCase();

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

const num = (n: number) => n.toLocaleString("es-CO");

function getDayOfWeek(fechaStr: string): number {
  const parts = fechaStr.split("/");
  const d = new Date(
    parseInt(parts[2]),
    parseInt(parts[0]) - 1,
    parseInt(parts[1])
  );
  return d.getDay(); // 0=Dom, 1=Lun...6=Sab
}

function getWeekOfMonth(fechaStr: string): number {
  const parts = fechaStr.split("/");
  const day = parseInt(parts[1]);
  return Math.ceil(day / 7);
}

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
// Map getDay() (0=Sun) to our order (0=Mon)
const DAY_MAP: Record<number, number> = {
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  0: 6,
};

const PanoramaSection = ({ data }: PanoramaSectionProps) => {
  const activeRows = useMemo(
    () => data.filter((r) => !EXCLUIDOS.includes(norm(r.estado_actual))),
    [data]
  );

  // KPIs
  const kpis = useMemo(() => {
    const activeIds = new Set(activeRows.map((r) => r.order_id));
    const totalOrdenes = activeIds.size;
    const totalRevenue = activeRows.reduce(
      (s, r) => s + r.pvp_total * r.unidades,
      0
    );
    const aov = totalOrdenes > 0 ? totalRevenue / totalOrdenes : 0;

    // Margen Neto Promedio — use raw data field, re-parse to handle NaN
    const margenValues = activeRows
      .map((r) => r.margen_neto)
      .filter((v) => !isNaN(v) && v !== 0);
    const margenPromedio =
      margenValues.length > 0
        ? margenValues.reduce((a, b) => a + b, 0) / margenValues.length
        : 0;

    const allIds = new Set(data.map((r) => r.order_id));
    const entregadoIds = new Set(
      data
        .filter((r) => norm(r.estado_actual) === "entregado")
        .map((r) => r.order_id)
    );
    const tasaExito =
      allIds.size > 0 ? (entregadoIds.size / allIds.size) * 100 : 0;

    const estrellasActivas = new Set(
      activeRows.map((r) => r.estrella_nombre).filter(Boolean)
    ).size;

    return {
      totalRevenue,
      totalOrdenes,
      aov,
      margenPromedio,
      tasaExito,
      estrellasActivas,
    };
  }, [activeRows, data]);

  // Revenue por semana
  const weeklyRevenue = useMemo(() => {
    const map = new Map<number, number>();
    activeRows.forEach((r) => {
      if (r.semana_del_anio > 0) {
        map.set(
          r.semana_del_anio,
          (map.get(r.semana_del_anio) || 0) + r.pvp_total * r.unidades
        );
      }
    });
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([week, revenue]) => ({ week: `S${week}`, revenue }));
  }, [activeRows]);

  // Heatmap data
  const heatmapData = useMemo(() => {
    // Find max week of month
    const weekSet = new Set<number>();
    const cellMap = new Map<string, Set<string>>();

    activeRows.forEach((r) => {
      if (!r.fecha_creacion) return;
      const dow = getDayOfWeek(r.fecha_creacion);
      const wom = getWeekOfMonth(r.fecha_creacion);
      const dayIdx = DAY_MAP[dow];
      if (dayIdx === undefined) return;
      weekSet.add(wom);
      const key = `${dayIdx}-${wom}`;
      if (!cellMap.has(key)) cellMap.set(key, new Set());
      cellMap.get(key)!.add(r.order_id);
    });

    const weeks = [...weekSet].sort((a, b) => a - b);
    return { weeks, cellMap };
  }, [activeRows]);

  const heatColor = (count: number) => {
    if (count === 0) return "bg-muted/30";
    if (count <= 2) return "bg-chart-purple/20";
    if (count <= 5) return "bg-chart-purple/50";
    return "bg-chart-purple/80";
  };

  const heatText = (count: number) => {
    if (count === 0) return "text-muted-foreground/50";
    return "text-chart-purple-foreground";
  };

  const kpiCards = [
    {
      label: "REVENUE PVP",
      value: fmt(kpis.totalRevenue),
      icon: DollarSign,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "ÓRDENES",
      value: num(kpis.totalOrdenes),
      icon: ShoppingCart,
      color: "text-process",
      bg: "bg-process/10",
    },
    {
      label: "AOV",
      value: fmt(kpis.aov),
      icon: TrendingUp,
      color: "text-pending",
      bg: "bg-pending/10",
    },
    {
      label: "MARGEN NETO PROM.",
      value: `${kpis.margenPromedio.toFixed(1)}%`,
      icon: PieChart,
      color: "text-chart-purple",
      bg: "bg-chart-purple/10",
    },
    {
      label: "TASA DE ÉXITO",
      value: `${kpis.tasaExito.toFixed(1)}%`,
      icon: Percent,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "ESTRELLAS ACTIVAS",
      value: num(kpis.estrellasActivas),
      icon: Star,
      color: "text-pending",
      bg: "bg-pending/10",
    },
  ];

  return (
    <Tabs defaultValue="vision" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="vision">Visión General</TabsTrigger>
      </TabsList>

      <TabsContent value="vision" className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
          {kpiCards.map((c) => (
            <TooltipProvider key={c.label} delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="border border-border shadow-sm">
                    <CardContent className="px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">
                            {c.label}
                          </p>
                          <p className="text-[22px] font-bold tracking-tight leading-tight mt-0.5">
                            {c.value}
                          </p>
                        </div>
                        <div className={`rounded-md p-1.5 ${c.bg} shrink-0`}>
                          <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                  {c.label}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        {/* Revenue por Semana */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Revenue por Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyRevenue}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) =>
                      `$${(v / 1_000_000).toFixed(1)}M`
                    }
                  />
                  <RTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [fmt(value), "Revenue"]}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {weeklyRevenue.map((_, i) => (
                      <Cell
                        key={i}
                        fill="hsl(var(--chart-purple))"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Heatmap */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Órdenes por Día de la Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                      Día
                    </th>
                    {heatmapData.weeks.map((w) => (
                      <th
                        key={w}
                        className="text-center py-2 px-3 text-muted-foreground font-medium"
                      >
                        Semana {w}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAY_LABELS.map((label, dayIdx) => (
                    <tr key={dayIdx} className="border-t border-border/50">
                      <td className="py-2 px-3 font-medium text-muted-foreground">
                        {label}
                      </td>
                      {heatmapData.weeks.map((w) => {
                        const count =
                          heatmapData.cellMap.get(`${dayIdx}-${w}`)?.size || 0;
                        return (
                          <td key={w} className="py-1.5 px-1.5 text-center">
                            <div
                              className={`rounded-md py-2 px-3 font-semibold ${heatColor(count)} ${heatText(count)}`}
                            >
                              {count}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default PanoramaSection;
