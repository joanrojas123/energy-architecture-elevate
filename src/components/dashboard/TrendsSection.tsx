import { useMemo, useState } from "react";
import { type SalesRow } from "@/lib/csv-processor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LabelList, Legend,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface TrendsSectionProps {
  data: SalesRow[]; // ALL rows (unfiltered)
}

const ESTADOS_EXCLUIDOS = ["cancelado", "rechazado"];
const normalize = (s: string) => (s || "").toString().trim().toLowerCase();

const formatCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const formatCompact = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const pctStr = (n: number) => `${n.toFixed(1)}%`;

/* ── Per-month aggregation ── */
function buildMonthlyStats(rows: SalesRow[]) {
  const map: Record<string, { orders: Set<string>; revenue: number; units: number; entregadas: Set<string> }> = {};

  for (const r of rows) {
    const p = r.mes_id;
    if (!p) continue;
    if (!map[p]) map[p] = { orders: new Set(), revenue: 0, units: 0, entregadas: new Set() };
    const excluded = ESTADOS_EXCLUIDOS.includes(normalize(r.estado_actual));
    if (!excluded) {
      map[p].orders.add(r.order_id);
      const rev = r.pvp_total * r.unidades;
      if (!isNaN(rev) && rev > 0) map[p].revenue += rev;
      map[p].units += r.unidades;
      if (normalize(r.estado_actual) === "entregado") map[p].entregadas.add(r.order_id);
    }
  }

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, v]) => ({
      period,
      orders: v.orders.size,
      revenue: v.revenue,
      units: v.units,
      entregadas: v.entregadas.size,
      tasaExito: v.orders.size > 0 ? (v.entregadas.size / v.orders.size) * 100 : 0,
      aov: v.orders.size > 0 ? v.revenue / v.orders.size : 0,
    }));
}

/* ── Month metrics for comparator ── */
function monthMetrics(rows: SalesRow[]) {
  const active = rows.filter((r) => !ESTADOS_EXCLUIDOS.includes(normalize(r.estado_actual)));
  const orderIds = new Set(active.map((r) => r.order_id));
  const totalOrdenes = orderIds.size;
  const totalUnidades = active.reduce((s, r) => s + r.unidades, 0);
  const totalRevenue = active.reduce((s, r) => s + r.pvp_total * r.unidades, 0);
  const entregadas = new Set(active.filter((r) => normalize(r.estado_actual) === "entregado").map((r) => r.order_id)).size;
  const tasaExito = totalOrdenes > 0 ? (entregadas / totalOrdenes) * 100 : 0;
  const aov = totalOrdenes > 0 ? totalRevenue / totalOrdenes : 0;
  const marcas = new Set(active.map((r) => r.marca).filter(Boolean)).size;
  const estrellas = new Set(active.map((r) => r.estrella_nombre).filter(Boolean)).size;
  return { totalOrdenes, totalUnidades, totalRevenue, aov, tasaExito, marcas, estrellas };
}

/* ── Rankings ── */
function buildRankings(rows: SalesRow[]) {
  const active = rows.filter((r) => !ESTADOS_EXCLUIDOS.includes(normalize(r.estado_actual)));

  const brandRev: Record<string, number> = {};
  const prodUnits: Record<string, { units: number; revenue: number }> = {};
  const starData: Record<string, { revenue: number; orders: Set<string> }> = {};
  const cityData: Record<string, { orders: Set<string>; revenue: number }> = {};

  for (const r of active) {
    const rev = r.pvp_total * r.unidades;
    if (r.marca) brandRev[r.marca] = (brandRev[r.marca] || 0) + rev;
    if (r.producto) {
      if (!prodUnits[r.producto]) prodUnits[r.producto] = { units: 0, revenue: 0 };
      prodUnits[r.producto].units += r.unidades;
      prodUnits[r.producto].revenue += rev;
    }
    if (r.estrella_nombre) {
      if (!starData[r.estrella_nombre]) starData[r.estrella_nombre] = { revenue: 0, orders: new Set() };
      starData[r.estrella_nombre].revenue += rev;
      starData[r.estrella_nombre].orders.add(r.order_id);
    }
    if (r.ciudad) {
      if (!cityData[r.ciudad]) cityData[r.ciudad] = { orders: new Set(), revenue: 0 };
      cityData[r.ciudad].orders.add(r.order_id);
      cityData[r.ciudad].revenue += rev;
    }
  }

  const totalRev = Object.values(brandRev).reduce((s, v) => s + v, 0);
  const top = <T,>(obj: Record<string, T>, val: (v: T) => number) =>
    Object.entries(obj).sort((a, b) => val(b[1]) - val(a[1])).slice(0, 5);

  return {
    brands: top(brandRev, (v) => v).map(([name, v]) => ({ name, revenue: v, pct: totalRev > 0 ? (v / totalRev) * 100 : 0 })),
    products: top(prodUnits, (v) => v.units).map(([name, v]) => ({ name, units: v.units, revenue: v.revenue })),
    stars: top(starData, (v) => v.revenue).map(([name, v]) => ({ name, revenue: v.revenue, orders: v.orders.size })),
    cities: top(cityData, (v) => v.orders.size).map(([name, v]) => ({ name, orders: v.orders.size, revenue: v.revenue })),
  };
}

/* ── Component ── */
const TrendsSection = ({ data }: TrendsSectionProps) => {
  const meses = useMemo(() => [...new Set(data.map((r) => r.mes_id).filter(Boolean))].sort(), [data]);
  const [mesA, setMesA] = useState(meses[meses.length - 2] || meses[0] || "");
  const [mesB, setMesB] = useState(meses[meses.length - 1] || meses[0] || "");

  const monthly = useMemo(() => buildMonthlyStats(data), [data]);
  const rankings = useMemo(() => buildRankings(data), [data]);

  const comparison = useMemo(() => {
    const a = monthMetrics(data.filter((r) => r.mes_id === mesA));
    const b = monthMetrics(data.filter((r) => r.mes_id === mesB));
    return { a, b };
  }, [data, mesA, mesB]);

  const DiffCell = ({ a, b, isCurrency = false, isPct = false }: { a: number; b: number; isCurrency?: boolean; isPct?: boolean }) => {
    const diff = a > 0 ? ((b - a) / a) * 100 : 0;
    const color = diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground";
    const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
    const display = isPct ? `${(b - a).toFixed(1)}pp` : isCurrency ? formatCOP(b - a) : (b - a).toLocaleString();
    return (
      <td className={`py-2 text-right font-medium ${color}`}>
        <span className="inline-flex items-center gap-1">
          <Icon className="h-3.5 w-3.5" />
          {display} ({diff >= 0 ? "+" : ""}{diff.toFixed(1)}%)
        </span>
      </td>
    );
  };

  const compRows = [
    { label: "Total Órdenes", key: "totalOrdenes" as const },
    { label: "Total Unidades", key: "totalUnidades" as const },
    { label: "Revenue PVP", key: "totalRevenue" as const, isCurrency: true },
    { label: "AOV", key: "aov" as const, isCurrency: true },
    { label: "Tasa de Éxito %", key: "tasaExito" as const, isPct: true },
    { label: "Marcas Únicas", key: "marcas" as const },
    { label: "Estrellas Únicas", key: "estrellas" as const },
  ];

  const purpleColor = "hsl(262, 83%, 58%)";
  const greenColor = "hsl(160, 84%, 39%)";

  return (
    <div className="space-y-6">
      {/* ── Sección 1: Gráficas históricas ── */}
      <div className="grid gap-6">
        {/* Revenue por mes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue PVP por Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCOP(v)} />
                <Line type="monotone" dataKey="revenue" stroke={purpleColor} strokeWidth={2} dot={{ r: 4 }}>
                  <LabelList dataKey="revenue" position="top" formatter={formatCompact} style={{ fontSize: 10 }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Órdenes y Tasa de Éxito */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Órdenes y Tasa de Éxito por Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip formatter={(v: number, name: string) => name === "tasaExito" ? `${v.toFixed(1)}%` : v.toLocaleString()} />
                <Legend />
                <Bar yAxisId="left" dataKey="orders" name="Órdenes" fill={purpleColor} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="tasaExito" name="Tasa Éxito %" fill={greenColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AOV por mes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">AOV por Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCOP(v)} />
                <Line type="monotone" dataKey="aov" stroke={purpleColor} strokeWidth={2} dot={{ r: 4 }}>
                  <LabelList dataKey="aov" position="top" formatter={formatCompact} style={{ fontSize: 10 }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Sección 2: Comparador de meses ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Comparador de Meses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Mes A:</span>
              <Select value={mesA} onValueChange={setMesA}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {meses.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Mes B:</span>
              <Select value={mesB} onValueChange={setMesB}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {meses.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left font-medium text-muted-foreground">Métrica</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">{mesA}</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">{mesB}</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {compRows.map((row) => {
                  const va = comparison.a[row.key];
                  const vb = comparison.b[row.key];
                  const fmtA = row.isCurrency ? formatCOP(va) : row.isPct ? pctStr(va) : va.toLocaleString();
                  const fmtB = row.isCurrency ? formatCOP(vb) : row.isPct ? pctStr(vb) : vb.toLocaleString();
                  return (
                    <tr key={row.key} className="border-b border-border/50 last:border-0">
                      <td className="py-2 text-foreground">{row.label}</td>
                      <td className="py-2 text-right font-medium text-foreground">{fmtA}</td>
                      <td className="py-2 text-right font-medium text-foreground">{fmtB}</td>
                      <DiffCell a={va} b={vb} isCurrency={row.isCurrency} isPct={row.isPct} />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Sección 3: Rankings históricos ── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Top 5 Marcas Revenue */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top 5 Marcas por Revenue</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="pb-2 text-left font-medium text-muted-foreground">Marca</th>
                <th className="pb-2 text-right font-medium text-muted-foreground">Revenue</th>
                <th className="pb-2 text-right font-medium text-muted-foreground">%</th>
              </tr></thead>
              <tbody>
                {rankings.brands.map((r, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 text-foreground truncate max-w-[120px]">{r.name}</td>
                    <td className="py-1.5 text-right font-medium text-foreground">{formatCOP(r.revenue)}</td>
                    <td className="py-1.5 text-right text-muted-foreground">{r.pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Top 5 Productos */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top 5 Productos</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="pb-2 text-left font-medium text-muted-foreground">Producto</th>
                <th className="pb-2 text-right font-medium text-muted-foreground">Uds</th>
                <th className="pb-2 text-right font-medium text-muted-foreground">Revenue</th>
              </tr></thead>
              <tbody>
                {rankings.products.map((r, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 text-foreground truncate max-w-[120px]">{r.name}</td>
                    <td className="py-1.5 text-right font-medium text-foreground">{r.units.toLocaleString()}</td>
                    <td className="py-1.5 text-right font-medium text-foreground">{formatCOP(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Top 5 Estrellas */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top 5 Estrellas por Revenue</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="pb-2 text-left font-medium text-muted-foreground">Estrella</th>
                <th className="pb-2 text-right font-medium text-muted-foreground">Revenue</th>
                <th className="pb-2 text-right font-medium text-muted-foreground">Órdenes</th>
              </tr></thead>
              <tbody>
                {rankings.stars.map((r, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 text-foreground truncate max-w-[120px]">{r.name}</td>
                    <td className="py-1.5 text-right font-medium text-foreground">{formatCOP(r.revenue)}</td>
                    <td className="py-1.5 text-right font-medium text-foreground">{r.orders.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Top 5 Ciudades */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top 5 Ciudades por Órdenes</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="pb-2 text-left font-medium text-muted-foreground">Ciudad</th>
                <th className="pb-2 text-right font-medium text-muted-foreground">Órdenes</th>
                <th className="pb-2 text-right font-medium text-muted-foreground">Revenue</th>
              </tr></thead>
              <tbody>
                {rankings.cities.map((r, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 text-foreground truncate max-w-[120px]">{r.name}</td>
                    <td className="py-1.5 text-right font-medium text-foreground">{r.orders.toLocaleString()}</td>
                    <td className="py-1.5 text-right font-medium text-foreground">{formatCOP(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrendsSection;
