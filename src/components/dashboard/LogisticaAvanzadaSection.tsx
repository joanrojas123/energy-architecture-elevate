import { useState, useMemo, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Package, Clock, Activity } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell,
} from "recharts";

interface LogRow {
  period: string;
  order_id: string;
  shippingCompany: string;
  provider_name: string;
  ciudad_destino: string;
  departamento_destino: string;
  estado_actual_orden: string;
  paso_del_historial: string;
  paso_siguiente: string;
  fecha_actual_col: string;
  horas_entre_estados: number;
  tipo_actualizacion: string;
  pct_actualizaciones_bulk: number;
  orden_fecha_creacion: string;
  tramo_logistico: string;
  es_retroceso: string;
  ultimo_tramo_alcanzado: string;
  alerta_logistica: string;
  horas_desde_creacion_hasta_hoy: number;
  dias_desde_creacion_hasta_hoy: number;
}

const str = (v: any) => (v || "").toString().trim();

async function fetchLogistica(): Promise<LogRow[]> {
  let all: any[] = [];
  let from = 0;
  const ps = 1000;
  let done = false;
  while (!done) {
    const { data, error } = await supabase.from("Logistica").select("*").range(from, from + ps - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) { done = true; } else {
      all = all.concat(data);
      if (data.length < ps) done = true;
      from += ps;
    }
  }
  return all.map((r) => ({
    period: str(r.period),
    order_id: str(r.order_id),
    shippingCompany: str(r.shippingCompany),
    provider_name: str(r.provider_name),
    ciudad_destino: str(r.ciudad_destino),
    departamento_destino: str(r.departamento_destino),
    estado_actual_orden: str(r.estado_actual_orden),
    paso_del_historial: str(r.paso_del_historial),
    paso_siguiente: str(r.paso_siguiente),
    fecha_actual_col: str(r.fecha_actual_col),
    horas_entre_estados: parseFloat(r.horas_entre_estados) || 0,
    tipo_actualizacion: str(r.tipo_actualizacion),
    pct_actualizaciones_bulk: parseFloat(r.pct_actualizaciones_bulk) || 0,
    orden_fecha_creacion: str(r.orden_fecha_creacion),
    tramo_logistico: str(r.tramo_logistico),
    es_retroceso: str(r.es_retroceso),
    ultimo_tramo_alcanzado: str(r.ultimo_tramo_alcanzado),
    alerta_logistica: str(r.alerta_logistica),
    horas_desde_creacion_hasta_hoy: parseFloat(r.horas_desde_creacion_hasta_hoy) || 0,
    dias_desde_creacion_hasta_hoy: parseFloat(r.dias_desde_creacion_hasta_hoy) || 0,
  }));
}

const unique = (rows: LogRow[], key: keyof LogRow) =>
  [...new Set(rows.map((r) => String(r[key])).filter(Boolean))].sort();

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-3 mt-2">
    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{title}</h3>
    <div className="h-px flex-1 bg-border" />
  </div>
);

type SortDir = "asc" | "desc";

const LogisticaAvanzadaSection = () => {
  const [data, setData] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("all");
  const [company, setCompany] = useState("all");
  const [brand, setBrand] = useState("all");

  // sortable tables state
  const [carrierSort, setCarrierSort] = useState<{ col: string; dir: SortDir }>({ col: "ordenes", dir: "desc" });
  const [brandSort, setBrandSort] = useState<{ col: string; dir: SortDir }>({ col: "ordenes", dir: "desc" });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { setData(await fetchLogistica()); } catch (e: any) { setError(e.message); } finally { setLoading(false); }
    })();
  }, []);

  const periods = useMemo(() => unique(data, "period"), [data]);
  const companies = useMemo(() => unique(data, "shippingCompany"), [data]);
  const brands = useMemo(() => unique(data, "provider_name"), [data]);

  const filtered = useMemo(() => {
    let d = data;
    if (period !== "all") d = d.filter((r) => r.period === period);
    if (company !== "all") d = d.filter((r) => r.shippingCompany === company);
    if (brand !== "all") d = d.filter((r) => r.provider_name === brand);
    return d;
  }, [data, period, company, brand]);

  // ---- KPIs ----
  const kpis = useMemo(() => {
    const ids = new Set(filtered.map((r) => r.order_id));
    const alertIds = new Set(filtered.filter((r) => r.alerta_logistica.includes("🔴")).map((r) => r.order_id));
    const avgHoras = filtered.length > 0
      ? filtered.reduce((s, r) => s + r.horas_desde_creacion_hasta_hoy, 0) / filtered.length : 0;
    const avgBulk = filtered.length > 0
      ? filtered.reduce((s, r) => s + r.pct_actualizaciones_bulk, 0) / filtered.length : 0;
    return { total: ids.size, alertas: alertIds.size, avgHoras, avgBulk };
  }, [filtered]);

  // ---- Embudo tramos ----
  const funnelData = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    for (const r of filtered) {
      if (!r.tramo_logistico) continue;
      const e = map.get(r.tramo_logistico) || { sum: 0, count: 0 };
      e.sum += r.horas_entre_estados;
      e.count++;
      map.set(r.tramo_logistico, e);
    }
    const arr = [...map.entries()]
      .map(([tramo, v]) => ({ tramo, avg: v.count > 0 ? v.sum / v.count : 0, count: v.count }))
      .sort((a, b) => a.tramo.localeCompare(b.tramo));
    return arr;
  }, [filtered]);

  const maxFunnelAvg = Math.max(...funnelData.map((d) => d.avg), 1);

  // ---- Carrier table ----
  const carrierTable = useMemo(() => {
    const map = new Map<string, { ids: Set<string>; t0: number[]; t1: number[]; t2: number[]; t3: number[]; bulk: number[]; alertas: Set<string> }>();
    for (const r of filtered) {
      const k = r.shippingCompany || "(vacío)";
      if (!map.has(k)) map.set(k, { ids: new Set(), t0: [], t1: [], t2: [], t3: [], bulk: [], alertas: new Set() });
      const e = map.get(k)!;
      e.ids.add(r.order_id);
      if (r.tramo_logistico.startsWith("0")) e.t0.push(r.horas_entre_estados);
      if (r.tramo_logistico.startsWith("1")) e.t1.push(r.horas_entre_estados);
      if (r.tramo_logistico.startsWith("2")) e.t2.push(r.horas_entre_estados);
      if (r.tramo_logistico.startsWith("3")) e.t3.push(r.horas_entre_estados);
      e.bulk.push(r.pct_actualizaciones_bulk);
      if (r.alerta_logistica.includes("🔴")) e.alertas.add(r.order_id);
    }
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const rows = [...map.entries()].map(([name, v]) => ({
      name, ordenes: v.ids.size,
      t0: avg(v.t0), t1: avg(v.t1), t2: avg(v.t2), t3: avg(v.t3),
      bulk: avg(v.bulk), alertas: v.alertas.size,
    }));
    const { col, dir } = carrierSort;
    rows.sort((a, b) => {
      const av = (a as any)[col] ?? 0, bv = (b as any)[col] ?? 0;
      return dir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return rows;
  }, [filtered, carrierSort]);

  // ---- Brand table ----
  const brandTable = useMemo(() => {
    const map = new Map<string, { ids: Set<string>; t1: number[]; total: number[]; alertas: Set<string>; cancelIds: Set<string> }>();
    for (const r of filtered) {
      const k = r.provider_name || "(vacío)";
      if (!map.has(k)) map.set(k, { ids: new Set(), t1: [], total: [], alertas: new Set(), cancelIds: new Set() });
      const e = map.get(k)!;
      e.ids.add(r.order_id);
      if (r.tramo_logistico.startsWith("1")) e.t1.push(r.horas_entre_estados);
      e.total.push(r.horas_desde_creacion_hasta_hoy);
      if (r.alerta_logistica.includes("🔴")) e.alertas.add(r.order_id);
      if (r.tramo_logistico.toLowerCase().includes("cancelaci") || r.tramo_logistico.toLowerCase().includes("devoluci")) {
        e.cancelIds.add(r.order_id);
      }
    }
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const rows = [...map.entries()].map(([name, v]) => ({
      name, ordenes: v.ids.size,
      avgT1: avg(v.t1), avgTotal: avg(v.total),
      alertas: v.alertas.size,
      pctCancel: v.ids.size > 0 ? (v.cancelIds.size / v.ids.size) * 100 : 0,
    }));
    const { col, dir } = brandSort;
    rows.sort((a, b) => {
      const av = (a as any)[col] ?? 0, bv = (b as any)[col] ?? 0;
      return dir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return rows;
  }, [filtered, brandSort]);

  // ---- Ficción chart ----
  const ficcionData = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const r of filtered) {
      const k = r.shippingCompany || "(vacío)";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r.pct_actualizaciones_bulk);
    }
    return [...map.entries()].map(([name, arr]) => ({
      name, avg: arr.reduce((a, b) => a + b, 0) / arr.length,
    })).sort((a, b) => b.avg - a.avg);
  }, [filtered]);

  // ---- Alertas table ----
  const alertRows = useMemo(() => {
    const seen = new Map<string, LogRow>();
    for (const r of filtered) {
      if (r.alerta_logistica === "✅ Normal" || !r.alerta_logistica) continue;
      const existing = seen.get(r.order_id);
      if (!existing || r.dias_desde_creacion_hasta_hoy > existing.dias_desde_creacion_hasta_hoy) {
        seen.set(r.order_id, r);
      }
    }
    return [...seen.values()].sort((a, b) => b.dias_desde_creacion_hasta_hoy - a.dias_desde_creacion_hasta_hoy);
  }, [filtered]);

  const toggleSort = (
    current: { col: string; dir: SortDir },
    setter: (v: { col: string; dir: SortDir }) => void,
    col: string
  ) => {
    if (current.col === col) setter({ col, dir: current.dir === "asc" ? "desc" : "asc" });
    else setter({ col, dir: "desc" });
  };

  const sortIcon = (current: { col: string; dir: SortDir }, col: string) =>
    current.col === col ? (current.dir === "asc" ? " ↑" : " ↓") : "";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">Cargando datos de Logística…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <AlertTriangle className="h-12 w-12 text-destructive/60" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[150px] bg-background text-xs h-8"><SelectValue placeholder="Período" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {periods.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={company} onValueChange={setCompany}>
          <SelectTrigger className="w-[170px] bg-background text-xs h-8"><SelectValue placeholder="Transportadora" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {companies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={brand} onValueChange={setBrand}>
          <SelectTrigger className="w-[170px] bg-background text-xs h-8"><SelectValue placeholder="Marca" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <SectionHeader title="Indicadores Clave" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "ÓRDENES ÚNICAS", value: kpis.total.toLocaleString("es-CO"), icon: Package, color: "text-process", bg: "bg-process/10" },
          { label: "ALERTAS 🔴", value: kpis.alertas.toLocaleString("es-CO"), icon: AlertTriangle, color: "text-error", bg: "bg-error/10" },
          { label: "TIEMPO PROMEDIO", value: `${kpis.avgHoras.toFixed(1)} h`, icon: Clock, color: "text-pending", bg: "bg-pending/10" },
          { label: "FICCIÓN LOGÍSTICA", value: `${kpis.avgBulk.toFixed(1)}%`, icon: Activity, color: "text-chart-purple", bg: "bg-chart-purple/10" },
        ].map((c) => (
          <Card key={c.label} className="border border-border shadow-sm">
            <CardContent className="px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</p>
                  <p className="text-[22px] font-bold tracking-tight mt-0.5">{c.value}</p>
                </div>
                <div className={`rounded-md p-1.5 ${c.bg} shrink-0`}>
                  <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Funnel */}
      <SectionHeader title="Embudo de Tiempos por Tramo" />
      <Card className="border border-border shadow-sm">
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={funnelData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} label={{ value: "Avg horas", position: "insideBottomRight", offset: -5, fontSize: 10 }} />
              <YAxis type="category" dataKey="tramo" width={180} tick={{ fontSize: 10 }} />
              <RTooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(value: number, _: any, entry: any) => [
                  `${value.toFixed(1)} h (${entry.payload.count} transiciones)`, "Promedio"
                ]}
              />
              <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                {funnelData.map((d, i) => {
                  const ratio = d.avg / maxFunnelAvg;
                  const h = Math.round(120 - ratio * 120); // 120=green → 0=red
                  return <Cell key={i} fill={`hsl(${h}, 75%, 50%)`} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Carrier Table */}
      <SectionHeader title="Análisis por Transportadora" />
      <Card className="border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  { col: "name", label: "Transportadora" },
                  { col: "ordenes", label: "Órdenes" },
                  { col: "t0", label: "Avg h. Tramo 0" },
                  { col: "t1", label: "Avg h. Tramo 1" },
                  { col: "t2", label: "Avg h. Tramo 2" },
                  { col: "t3", label: "Avg h. Tramo 3" },
                  { col: "bulk", label: "% Bulk" },
                  { col: "alertas", label: "Alertas 🔴" },
                ].map((h) => (
                  <TableHead key={h.col} className="cursor-pointer text-[11px] whitespace-nowrap" onClick={() => toggleSort(carrierSort, setCarrierSort, h.col)}>
                    {h.label}{sortIcon(carrierSort, h.col)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {carrierTable.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="text-xs font-medium">{r.name}</TableCell>
                  <TableCell className="text-xs">{r.ordenes}</TableCell>
                  <TableCell className="text-xs">{r.t0.toFixed(1)}</TableCell>
                  <TableCell className="text-xs">{r.t1.toFixed(1)}</TableCell>
                  <TableCell className="text-xs">{r.t2.toFixed(1)}</TableCell>
                  <TableCell className="text-xs">{r.t3.toFixed(1)}</TableCell>
                  <TableCell className="text-xs">{r.bulk.toFixed(1)}%</TableCell>
                  <TableCell className="text-xs text-error font-semibold">{r.alertas}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Brand Table */}
      <SectionHeader title="Análisis por Marca" />
      <Card className="border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  { col: "name", label: "Marca" },
                  { col: "ordenes", label: "Órdenes" },
                  { col: "avgT1", label: "Avg h. Alistamiento" },
                  { col: "avgTotal", label: "Avg h. Total" },
                  { col: "alertas", label: "Alertas 🔴" },
                  { col: "pctCancel", label: "% Cancelación" },
                ].map((h) => (
                  <TableHead key={h.col} className="cursor-pointer text-[11px] whitespace-nowrap" onClick={() => toggleSort(brandSort, setBrandSort, h.col)}>
                    {h.label}{sortIcon(brandSort, h.col)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {brandTable.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="text-xs font-medium">{r.name}</TableCell>
                  <TableCell className="text-xs">{r.ordenes}</TableCell>
                  <TableCell className="text-xs">{r.avgT1.toFixed(1)}</TableCell>
                  <TableCell className="text-xs">{r.avgTotal.toFixed(1)}</TableCell>
                  <TableCell className="text-xs text-error font-semibold">{r.alertas}</TableCell>
                  <TableCell className="text-xs">
                    <span className={r.pctCancel > 10 ? "text-error font-semibold" : r.pctCancel > 5 ? "text-pending font-medium" : "text-success"}>
                      {r.pctCancel.toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Ficción Chart */}
      <SectionHeader title="Ficción Logística por Transportadora" />
      <Card className="border border-border shadow-sm">
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={ficcionData} margin={{ bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} label={{ value: "% Bulk", angle: -90, position: "insideLeft", fontSize: 10 }} />
              <RTooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(value: number) => [`${value.toFixed(1)}% de actualizaciones son automáticas`, "Ficción"]}
              />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                {ficcionData.map((d, i) => (
                  <Cell key={i} fill={d.avg > 30 ? "hsl(var(--error))" : d.avg > 15 ? "hsl(var(--pending))" : "hsl(var(--success))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Alertas Table */}
      <SectionHeader title="Centro de Alertas 🔴" />
      <Card className="border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Order ID</TableHead>
                <TableHead className="text-[11px]">Transportadora</TableHead>
                <TableHead className="text-[11px]">Marca</TableHead>
                <TableHead className="text-[11px]">Ciudad</TableHead>
                <TableHead className="text-[11px]">Estado</TableHead>
                <TableHead className="text-[11px]">Tramo</TableHead>
                <TableHead className="text-[11px]">Alerta</TableHead>
                <TableHead className="text-[11px]">Días</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alertRows.map((r) => (
                <TableRow key={r.order_id}>
                  <TableCell className="text-xs font-mono">{r.order_id}</TableCell>
                  <TableCell className="text-xs">{r.shippingCompany}</TableCell>
                  <TableCell className="text-xs">{r.provider_name}</TableCell>
                  <TableCell className="text-xs">{r.ciudad_destino}</TableCell>
                  <TableCell className="text-xs">{r.estado_actual_orden}</TableCell>
                  <TableCell className="text-xs">{r.tramo_logistico}</TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={r.alerta_logistica.includes("🔴") ? "destructive" : "secondary"} className={`text-[10px] ${r.alerta_logistica.includes("🟡") ? "bg-pending text-pending-foreground" : ""}`}>
                      {r.alerta_logistica}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-semibold">{r.dias_desde_creacion_hasta_hoy.toFixed(0)}</TableCell>
                </TableRow>
              ))}
              {alertRows.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">Sin alertas activas</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default LogisticaAvanzadaSection;
