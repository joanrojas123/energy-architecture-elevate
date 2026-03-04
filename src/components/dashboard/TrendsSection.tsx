import { useMemo, useState } from "react";
import { type SalesRow } from "@/lib/csv-processor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LabelList, Legend, ComposedChart,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, Minus, ArrowUpDown } from "lucide-react";

interface TrendsSectionProps {
  data: SalesRow[];
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

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-3">
    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{title}</h3>
    <div className="h-px flex-1 bg-border" />
  </div>
);

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

/* ── Sortable table hook ── */
function useSortable<T>(data: T[], defaultKey: keyof T, defaultDir: "asc" | "desc" = "desc") {
  const [sortKey, setSortKey] = useState<keyof T>(defaultKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultDir);
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const va = a[sortKey]; const vb = b[sortKey];
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);
  const toggle = (key: keyof T) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };
  return { sorted, sortKey, sortDir, toggle };
}

const SortHeader = ({ label, active, dir, onClick }: { label: string; active: boolean; dir: string; onClick: () => void }) => (
  <th className="pb-1.5 text-right font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={onClick}>
    <span className="inline-flex items-center gap-0.5">
      {label}
      {active && <ArrowUpDown className="h-3 w-3" />}
    </span>
  </th>
);

const purpleColor = "hsl(262, 83%, 58%)";
const greenColor = "hsl(160, 84%, 39%)";

/* ── Component ── */
const TrendsSection = ({ data }: TrendsSectionProps) => {
  const meses = useMemo(() => [...new Set(data.map((r) => r.mes_id).filter(Boolean))].sort(), [data]);
  const [mesA, setMesA] = useState(meses[meses.length - 2] || meses[0] || "");
  const [mesB, setMesB] = useState(meses[meses.length - 1] || meses[0] || "");
  const monthly = useMemo(() => buildMonthlyStats(data), [data]);
  const active = useMemo(() => data.filter((r) => !ESTADOS_EXCLUIDOS.includes(normalize(r.estado_actual))), [data]);

  const comparison = useMemo(() => {
    const a = monthMetrics(data.filter((r) => r.mes_id === mesA));
    const b = monthMetrics(data.filter((r) => r.mes_id === mesB));
    return { a, b };
  }, [data, mesA, mesB]);

  /* ── Marcas table data ── */
  const brandTable = useMemo(() => {
    const map: Record<string, { revenue: number; orders: Set<string>; entregadas: Set<string> }> = {};
    for (const r of active) {
      if (!r.marca) continue;
      if (!map[r.marca]) map[r.marca] = { revenue: 0, orders: new Set(), entregadas: new Set() };
      map[r.marca].revenue += r.pvp_total * r.unidades;
      map[r.marca].orders.add(r.order_id);
      if (normalize(r.estado_actual) === "entregado") map[r.marca].entregadas.add(r.order_id);
    }
    return Object.entries(map).map(([name, v]) => ({
      name,
      revenue: v.revenue,
      orders: v.orders.size,
      aov: v.orders.size > 0 ? v.revenue / v.orders.size : 0,
      tasaExito: v.orders.size > 0 ? (v.entregadas.size / v.orders.size) * 100 : 0,
    }));
  }, [active]);

  /* ── Estrellas table data ── */
  const starTable = useMemo(() => {
    const map: Record<string, { revenue: number; orders: Set<string>; lastDate: string; segment: string; entregadas: Set<string> }> = {};
    for (const r of active) {
      if (!r.estrella_nombre) continue;
      if (!map[r.estrella_nombre]) map[r.estrella_nombre] = { revenue: 0, orders: new Set(), lastDate: "", segment: "", entregadas: new Set() };
      const entry = map[r.estrella_nombre];
      entry.revenue += r.pvp_total * r.unidades;
      entry.orders.add(r.order_id);
      if (r.fecha_creacion > entry.lastDate) entry.lastDate = r.fecha_creacion;
      entry.segment = r.estrella_inactivity_segment || entry.segment;
      if (normalize(r.estado_actual) === "entregado") entry.entregadas.add(r.order_id);
    }
    return Object.entries(map).map(([name, v]) => ({
      name,
      revenue: v.revenue,
      orders: v.orders.size,
      aov: v.orders.size > 0 ? v.revenue / v.orders.size : 0,
      lastDate: v.lastDate,
      segment: v.segment,
      tasaExito: v.orders.size > 0 ? (v.entregadas.size / v.orders.size) * 100 : 0,
    }));
  }, [active]);

  const ESTADOS_EN_TRANSITO = [
    "despachada", "en bodega destino", "en bodega origen", "en transito",
    "novedad", "en reparto", "preparado para transportadora", "en reexpedicion",
    "en espera de ruta domestica", "en ruta", "en bodega principal",
    "en camino", "en espera de rx", "sin movimientos",
  ];

  const [logMes, setLogMes] = useState("all");

  /* ── Logística data ── */
  const logisticaData = useMemo(() => {
    const src = logMes === "all" ? data : data.filter((r) => r.mes_id === logMes);
    const transportMap: Record<string, { orders: Set<string>; entregadas: Set<string>; enTransito: Set<string>; canceladas: Set<string> }> = {};
    const cityMap: Record<string, { orders: Set<string>; revenue: number }> = {};
    for (const r of src) {
      if (r.shipping_company) {
        if (!transportMap[r.shipping_company]) transportMap[r.shipping_company] = { orders: new Set(), entregadas: new Set(), enTransito: new Set(), canceladas: new Set() };
        transportMap[r.shipping_company].orders.add(r.order_id);
        const st = normalize(r.estado_actual);
        if (st === "entregado") transportMap[r.shipping_company].entregadas.add(r.order_id);
        if (ESTADOS_EN_TRANSITO.includes(st)) transportMap[r.shipping_company].enTransito.add(r.order_id);
        if (ESTADOS_EXCLUIDOS.includes(st)) transportMap[r.shipping_company].canceladas.add(r.order_id);
      }
      if (r.ciudad && !ESTADOS_EXCLUIDOS.includes(normalize(r.estado_actual))) {
        if (!cityMap[r.ciudad]) cityMap[r.ciudad] = { orders: new Set(), revenue: 0 };
        cityMap[r.ciudad].orders.add(r.order_id);
        cityMap[r.ciudad].revenue += r.pvp_total * r.unidades;
      }
    }
    const transportadoras = Object.entries(transportMap).map(([name, v]) => {
      const base = v.orders.size - v.canceladas.size;
      return {
        name, orders: v.orders.size, entregadas: v.entregadas.size,
        enTransito: v.enTransito.size, canceladas: v.canceladas.size,
        tasaExito: base > 0 ? (v.entregadas.size / base) * 100 : 0,
      };
    });
    const cities = Object.entries(cityMap)
      .map(([name, v]) => ({ name, orders: v.orders.size, revenue: v.revenue }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 15);
    const maxCityOrders = Math.max(...cities.map(c => c.orders), 1);
    return { transportadoras, cities, maxCityOrders };
  }, [data, logMes]);

  const brandSort = useSortable(brandTable, "revenue");
  const starSort = useSortable(starTable, "revenue");
  const transportSort = useSortable(logisticaData.transportadoras, "orders");

  const segmentColor = (seg: string) => {
    const s = normalize(seg);
    if (s === "disponible" || s === "activo" || s === "active") return "bg-success/15 text-success";
    if (s.includes("ei1") || s.includes("ei2") || s.includes("inactivo")) return "bg-pending/15 text-pending";
    return "bg-error/15 text-error"; // ei3, cesada, etc.
  };

  const DiffCell = ({ a, b, isCurrency = false, isPct = false }: { a: number; b: number; isCurrency?: boolean; isPct?: boolean }) => {
    const diff = a > 0 ? ((b - a) / a) * 100 : 0;
    const color = diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground";
    const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
    const display = isPct ? `${(b - a).toFixed(1)}pp` : isCurrency ? formatCOP(b - a) : (b - a).toLocaleString();
    return (
      <td className={`py-1.5 text-right font-medium ${color}`}>
        <span className="inline-flex items-center gap-1">
          <Icon className="h-3 w-3" />
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

  return (
    <div className="space-y-4">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="marcas">Marcas</TabsTrigger>
          <TabsTrigger value="estrellas">Estrellas</TabsTrigger>
          <TabsTrigger value="logistica">Logística</TabsTrigger>
        </TabsList>

        {/* ══ GENERAL ══ */}
        <TabsContent value="general" className="space-y-4">
          <SectionHeader title="Gráficas Históricas" />
          <div className="grid gap-4">
            <Card>
              <CardHeader className="px-3 py-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Revenue PVP por Mes</CardTitle></CardHeader>
              <CardContent className="px-3 pb-3">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,20%)" />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={formatCompact} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => formatCOP(v)} />
                    <Line type="monotone" dataKey="revenue" stroke={purpleColor} strokeWidth={2} dot={{ r: 3 }}>
                      <LabelList dataKey="revenue" position="top" formatter={formatCompact} style={{ fontSize: 9 }} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Órdenes (bars) + Tasa Éxito (smooth line) */}
            <Card>
              <CardHeader className="px-3 py-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Órdenes y Tasa de Éxito por Mes</CardTitle></CardHeader>
              <CardContent className="px-3 pb-3">
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,20%)" />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip formatter={(v: number, name: string) => name === "Tasa Éxito %" ? `${v.toFixed(1)}%` : v.toLocaleString()} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="orders" name="Órdenes" fill={purpleColor} radius={[3, 3, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="tasaExito" name="Tasa Éxito %" stroke={greenColor} strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-3 py-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">AOV por Mes</CardTitle></CardHeader>
              <CardContent className="px-3 pb-3">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,20%)" />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={formatCompact} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => formatCOP(v)} />
                    <Line type="monotone" dataKey="aov" stroke={purpleColor} strokeWidth={2} dot={{ r: 3 }}>
                      <LabelList dataKey="aov" position="top" formatter={formatCompact} style={{ fontSize: 9 }} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Comparador */}
          <SectionHeader title="Comparador de Meses" />
          <Card>
            <CardContent className="px-3 py-3">
              <div className="mb-3 flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Mes A:</span>
                  <Select value={mesA} onValueChange={setMesA}>
                    <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{meses.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Mes B:</span>
                  <Select value={mesB} onValueChange={setMesB}>
                    <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{meses.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-1.5 text-left font-medium text-muted-foreground">Métrica</th>
                      <th className="pb-1.5 text-right font-medium text-muted-foreground">{mesA}</th>
                      <th className="pb-1.5 text-right font-medium text-muted-foreground">{mesB}</th>
                      <th className="pb-1.5 text-right font-medium text-muted-foreground">Diferencia</th>
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
                          <td className="py-1.5 text-foreground">{row.label}</td>
                          <td className="py-1.5 text-right font-medium text-foreground">{fmtA}</td>
                          <td className="py-1.5 text-right font-medium text-foreground">{fmtB}</td>
                          <DiffCell a={va} b={vb} isCurrency={row.isCurrency} isPct={row.isPct} />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ MARCAS ══ */}
        <TabsContent value="marcas" className="space-y-4">
          <SectionHeader title="Análisis por Marca" />
          <Card>
            <CardContent className="px-3 py-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-1.5 text-left font-medium text-muted-foreground cursor-pointer" onClick={() => brandSort.toggle("name")}>Marca</th>
                      <SortHeader label="Revenue" active={brandSort.sortKey === "revenue"} dir={brandSort.sortDir} onClick={() => brandSort.toggle("revenue")} />
                      <SortHeader label="Órdenes" active={brandSort.sortKey === "orders"} dir={brandSort.sortDir} onClick={() => brandSort.toggle("orders")} />
                      <SortHeader label="AOV" active={brandSort.sortKey === "aov"} dir={brandSort.sortDir} onClick={() => brandSort.toggle("aov")} />
                      <SortHeader label="Tasa Éxito %" active={brandSort.sortKey === "tasaExito"} dir={brandSort.sortDir} onClick={() => brandSort.toggle("tasaExito")} />
                    </tr>
                  </thead>
                  <tbody>
                    {brandSort.sorted.map((r) => (
                      <tr key={r.name} className="border-b border-border/50 last:border-0">
                        <td className="py-1.5 text-foreground max-w-[180px] truncate">{r.name}</td>
                        <td className="py-1.5 text-right font-medium text-foreground">{formatCOP(r.revenue)}</td>
                        <td className="py-1.5 text-right font-medium text-foreground">{r.orders.toLocaleString()}</td>
                        <td className="py-1.5 text-right font-medium text-foreground">{formatCOP(r.aov)}</td>
                        <td className="py-1.5 text-right font-medium text-foreground">{r.tasaExito.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ ESTRELLAS ══ */}
        <TabsContent value="estrellas" className="space-y-4">
          <SectionHeader title="Análisis por Estrella" />
          <Card>
            <CardContent className="px-3 py-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-1.5 text-left font-medium text-muted-foreground cursor-pointer" onClick={() => starSort.toggle("name")}>Estrella</th>
                      <SortHeader label="Revenue" active={starSort.sortKey === "revenue"} dir={starSort.sortDir} onClick={() => starSort.toggle("revenue")} />
                      <SortHeader label="Órdenes" active={starSort.sortKey === "orders"} dir={starSort.sortDir} onClick={() => starSort.toggle("orders")} />
                      <SortHeader label="AOV" active={starSort.sortKey === "aov"} dir={starSort.sortDir} onClick={() => starSort.toggle("aov")} />
                      <th className="pb-1.5 text-right font-medium text-muted-foreground">Última Orden</th>
                      <th className="pb-1.5 text-center font-medium text-muted-foreground">Segmento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {starSort.sorted.map((r) => (
                      <tr key={r.name} className="border-b border-border/50 last:border-0">
                        <td className="py-1.5 text-foreground max-w-[180px] truncate">{r.name}</td>
                        <td className="py-1.5 text-right font-medium text-foreground">{formatCOP(r.revenue)}</td>
                        <td className="py-1.5 text-right font-medium text-foreground">{r.orders.toLocaleString()}</td>
                        <td className="py-1.5 text-right font-medium text-foreground">{formatCOP(r.aov)}</td>
                        <td className="py-1.5 text-right text-muted-foreground">{r.lastDate}</td>
                        <td className="py-1.5 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${segmentColor(r.segment)}`}>
                            {r.segment || "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ LOGÍSTICA ══ */}
        <TabsContent value="logistica" className="space-y-4">
          <SectionHeader title="Transportadoras" />
          <Card>
            <CardContent className="px-3 py-3">
              <div className="mb-3 flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Mes:</span>
                <Select value={logMes} onValueChange={setLogMes}>
                  <SelectTrigger className="h-7 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {meses.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-1.5 text-left font-medium text-muted-foreground cursor-pointer" onClick={() => transportSort.toggle("name")}>Transportadora</th>
                      <SortHeader label="Órdenes" active={transportSort.sortKey === "orders"} dir={transportSort.sortDir} onClick={() => transportSort.toggle("orders")} />
                      <SortHeader label="Entregadas" active={transportSort.sortKey === "entregadas"} dir={transportSort.sortDir} onClick={() => transportSort.toggle("entregadas")} />
                      <SortHeader label="En Tránsito" active={transportSort.sortKey === "enTransito"} dir={transportSort.sortDir} onClick={() => transportSort.toggle("enTransito")} />
                      <SortHeader label="Canceladas" active={transportSort.sortKey === "canceladas"} dir={transportSort.sortDir} onClick={() => transportSort.toggle("canceladas")} />
                      <SortHeader label="Tasa Éxito %" active={transportSort.sortKey === "tasaExito"} dir={transportSort.sortDir} onClick={() => transportSort.toggle("tasaExito")} />
                    </tr>
                  </thead>
                  <tbody>
                    {transportSort.sorted.map((r) => (
                      <tr key={r.name} className="border-b border-border/50 last:border-0">
                        <td className="py-1.5 text-foreground">{r.name}</td>
                        <td className="py-1.5 text-right font-medium text-foreground">{r.orders.toLocaleString()}</td>
                        <td className="py-1.5 text-right font-medium text-success">{r.entregadas.toLocaleString()}</td>
                        <td className="py-1.5 text-right font-medium text-info">{r.enTransito.toLocaleString()}</td>
                        <td className="py-1.5 text-right font-medium text-destructive">{r.canceladas.toLocaleString()}</td>
                        <td className="py-1.5 text-right font-medium text-foreground">{r.tasaExito.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <SectionHeader title="Top 15 Ciudades" />
          <Card>
            <CardContent className="px-3 py-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-1.5 text-left font-medium text-muted-foreground">Ciudad</th>
                      <th className="pb-1.5 text-right font-medium text-muted-foreground">Órdenes</th>
                      <th className="pb-1.5 text-right font-medium text-muted-foreground">Revenue</th>
                      <th className="pb-1.5 pl-3 text-left font-medium text-muted-foreground">Calor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logisticaData.cities.map((r) => {
                      const pct = (r.orders / logisticaData.maxCityOrders) * 100;
                      const hue = Math.max(0, 120 - (pct / 100) * 120); // red=hot, green=cool
                      return (
                        <tr key={r.name} className="border-b border-border/50 last:border-0">
                          <td className="py-1.5 text-foreground">{r.name}</td>
                          <td className="py-1.5 text-right font-medium text-foreground">{r.orders.toLocaleString()}</td>
                          <td className="py-1.5 text-right font-medium text-foreground">{formatCOP(r.revenue)}</td>
                          <td className="py-1.5 pl-3">
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, backgroundColor: `hsl(${hue}, 80%, 50%)` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrendsSection;
