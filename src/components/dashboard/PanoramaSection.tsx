import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign, ShoppingCart, TrendingUp, Activity, Percent, Users,
  ArrowUpDown, X, CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { SalesRow } from "@/lib/csv-processor";

interface Props {
  data: SalesRow[];
  rawData: SalesRow[];
}

const EXCL = ["cancelado", "rechazado"];
const INVALID_ESTRELLA = ["", "vacio", "vacio vacio"];
const displayEstrella = (name: string) => INVALID_ESTRELLA.includes(norm(name)) ? "Sin nombre" : name;
const norm = (s: string) => (s || "").trim().toLowerCase();

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const num = (n: number) => n.toLocaleString("es-CO");
const pct = (n: number) => `${n.toFixed(1)}%`;

const formatDateDMY = (d: string) => {
  if (!d) return "—";
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch { return d; }
};

type SortDir = "asc" | "desc";

function useSortable<T>(data: T[], defaultKey: keyof T, defaultDir: SortDir = "desc") {
  const [sortKey, setSortKey] = useState<keyof T>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const toggle = (key: keyof T) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const va = a[sortKey]; const vb = b[sortKey];
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  return { sorted, sortKey, sortDir, toggle };
}

const SortHeader = ({ label, active, dir, onClick }: { label: string; active: boolean; dir: SortDir; onClick: () => void }) => (
  <th className="pb-1.5 text-right font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors" onClick={onClick}>
    <span className="inline-flex items-center gap-1">
      {label}
      <ArrowUpDown className={`h-3 w-3 ${active ? "text-foreground" : "text-muted-foreground/40"}`} />
    </span>
  </th>
);

const SortHeaderLeft = ({ label, active, dir, onClick }: { label: string; active: boolean; dir: SortDir; onClick: () => void }) => (
  <th className="pb-1.5 text-left font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors" onClick={onClick}>
    <span className="inline-flex items-center gap-1">
      {label}
      <ArrowUpDown className={`h-3 w-3 ${active ? "text-foreground" : "text-muted-foreground/40"}`} />
    </span>
  </th>
);

interface KPI {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  tip: string;
}

const PanoramaSection = ({ data, rawData }: Props) => {
  /* ── Filter state ── */
  const [fMarcas, setFMarcas] = useState<string[]>([]);
  const [fProductos, setFProductos] = useState<string[]>([]);
  const [fEstrellas, setFEstrellas] = useState<string[]>([]);
  const [fSemanas, setFSemanas] = useState<string[]>([]);
  const [fCliente, setFCliente] = useState("");
  const [fDesde, setFDesde] = useState<Date | undefined>();
  const [fHasta, setFHasta] = useState<Date | undefined>();

  const clearFilters = () => {
    setFMarcas([]); setFProductos([]); setFEstrellas([]); setFSemanas([]); setFCliente(""); setFDesde(undefined); setFHasta(undefined);
  };

  const parseCualquierFecha = (f: string): Date | null => {
    if (!f) return null;
    // Formato M/D/YYYY
    if (f.includes('/') && f.length <= 10) {
      const p = f.trim().split('/');
      return new Date(parseInt(p[2]), parseInt(p[0]) - 1, parseInt(p[1]));
    }
    // Formato Date string completo
    const d = new Date(f);
    return isNaN(d.getTime()) ? null : d;
  };

  /* ── Unique values for dropdowns (from rawData) ── */
  const uniqueMarcas = useMemo(() => [...new Set(rawData.map(r => r.marca).filter(Boolean))].sort(), [rawData]);
  const uniqueProductos = useMemo(() => [...new Set(rawData.map(r => r.producto).filter(Boolean))].sort(), [rawData]);
  const uniqueEstrellas = useMemo(() =>
    [...new Set(rawData.map(r => r.estrella_nombre).filter(s => s && !INVALID_ESTRELLA.includes(norm(s))))].sort(),
    [rawData]
  );
  const uniqueSemanas = useMemo(() =>
    [...new Set(rawData.map(r => r.semana_del_anio).filter(Boolean))].sort((a, b) => a - b).map(String),
    [rawData]
  );

  const hasActiveFilters = fMarcas.length > 0 || fProductos.length > 0 || fEstrellas.length > 0 || fSemanas.length > 0 || fCliente !== "" || !!fDesde || !!fHasta;

  /* ── Apply filters to data (month-filtered) and rawData ── */
  const applyFilters = (rows: SalesRow[]) => {
    let f = rows;
    if (fMarcas.length > 0) f = f.filter(r => fMarcas.includes(r.marca));
    if (fProductos.length > 0) f = f.filter(r => fProductos.includes(r.producto));
    if (fEstrellas.length > 0) f = f.filter(r => fEstrellas.includes(r.estrella_nombre));
    if (fSemanas.length > 0) f = f.filter(r => fSemanas.includes(String(r.semana_del_anio)));
    if (fCliente) {
      const q = norm(fCliente);
      f = f.filter(r => norm(r.cliente).includes(q));
    }
    if (fDesde || fHasta) {
      const desdeDate = fDesde ? new Date(fDesde.getFullYear(), fDesde.getMonth(), fDesde.getDate(), 0, 0, 0) : null;
      const hastaDate = fHasta ? new Date(fHasta.getFullYear(), fHasta.getMonth(), fHasta.getDate(), 23, 59, 59, 999) : null;
      f = f.filter(r => {
        const d = parseCualquierFecha(r.fecha_creacion_dia);
        if (!d) return false;
        if (desdeDate && d < desdeDate) return false;
        if (hastaDate && d > hastaDate) return false;
        return true;
      });
    }
    return f;
  };

  const filteredKPIData = useMemo(() => applyFilters(data), [data, fMarcas, fProductos, fEstrellas, fSemanas, fCliente, fDesde, fHasta]);
  const filteredRawData = useMemo(() => applyFilters(rawData), [rawData, fMarcas, fProductos, fEstrellas, fSemanas, fCliente, fDesde, fHasta]);

  /* ── Clean data helpers ── */
  const cleanActive = (rows: SalesRow[]) =>
    rows.filter(r => !EXCL.includes(norm(r.estado_actual)) && r.pvp_total > 0);

  const cleanEstrellas = (rows: SalesRow[]) =>
    rows.filter(r => !INVALID_ESTRELLA.includes(norm(r.estrella_nombre)));

  /* ── KPIs (filtered by month + local filters) ── */
  const metrics = useMemo(() => {
    const active = cleanActive(filteredKPIData);
    const orderIds = new Set(active.map(r => r.order_id));
    const totalOrdenes = orderIds.size;
    const totalRevenue = active.reduce((s, r) => s + r.pvp_total * r.unidades, 0);
    const aov = totalOrdenes > 0 ? totalRevenue / totalOrdenes : 0;

    const margenValid = active.filter(r => r.margen_neto !== undefined && !isNaN(r.margen_neto) && r.margen_neto !== 0);
    const margenProm = margenValid.length > 0 ? margenValid.reduce((s, r) => s + r.margen_neto, 0) / margenValid.length : 0;

    const entregadas = new Set(active.filter(r => norm(r.estado_actual) === "entregado").map(r => r.order_id));
    const allOrderIds = new Set(filteredKPIData.map(r => r.order_id));
    const tasaExito = allOrderIds.size > 0 ? (entregadas.size / allOrderIds.size) * 100 : 0;

    const estrellas = new Set(active.map(r => r.estrella_nombre || "Sin nombre")).size;

    return { totalRevenue, totalOrdenes, aov, margenProm, tasaExito, estrellas };
  }, [filteredKPIData]);

  /* ── All filtered raw active rows ── */
  const allActive = useMemo(() => cleanActive(filteredRawData), [filteredRawData]);

  /* ── 1. Resumen por Mes ── */
  const mesRows = useMemo(() => {
    const map = new Map<string, { orders: Set<string>; revenue: number; entregadas: Set<string>; allOrders: Set<string> }>();
    for (const r of filteredRawData) {
      const m = r.mes_id;
      if (!m) continue;
      if (!map.has(m)) map.set(m, { orders: new Set(), revenue: 0, entregadas: new Set(), allOrders: new Set() });
      const e = map.get(m)!;
      e.allOrders.add(r.order_id);
      if (!EXCL.includes(norm(r.estado_actual)) && r.pvp_total > 0) {
        e.orders.add(r.order_id);
        e.revenue += r.pvp_total * r.unidades;
      }
      if (norm(r.estado_actual) === "entregado") e.entregadas.add(r.order_id);
    }
    return [...map.entries()].map(([mes, v]) => ({
      mes,
      ordenes: v.orders.size,
      revenue: Math.max(v.revenue, 0),
      aov: v.orders.size > 0 ? Math.max(v.revenue, 0) / v.orders.size : 0,
      tasaExito: v.allOrders.size > 0 ? (v.entregadas.size / v.allOrders.size) * 100 : 0,
    })).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [filteredRawData]);

  const mesTotals = useMemo(() => {
    const ordenes = mesRows.reduce((s, r) => s + r.ordenes, 0);
    const revenue = mesRows.reduce((s, r) => s + r.revenue, 0);
    return { ordenes, revenue, aov: ordenes > 0 ? revenue / ordenes : 0 };
  }, [mesRows]);

  const mesSort = useSortable(mesRows, "mes" as any, "asc");
  const maxMesRevenue = Math.max(...mesRows.map(r => r.revenue), 1);

  /* ── 2. Evolución Revenue (line chart) — exclude months with revenue <= 0 ── */
  const lineData = useMemo(() =>
    mesRows.filter(r => r.revenue > 0).map(r => ({ mes: r.mes, revenue: r.revenue })),
    [mesRows]
  );

  /* ── 3. Top 10 Marcas ── */
  const marcaRows = useMemo(() => {
    const map = new Map<string, { orders: Set<string>; revenue: number }>();
    for (const r of allActive) {
      const b = r.marca;
      if (!b) continue;
      if (!map.has(b)) map.set(b, { orders: new Set(), revenue: 0 });
      const e = map.get(b)!;
      e.orders.add(r.order_id);
      e.revenue += r.pvp_total * r.unidades;
    }
    const totalRev = [...map.values()].reduce((s, v) => s + v.revenue, 0);
    return [...map.entries()]
      .map(([marca, v]) => ({
        marca,
        ordenes: v.orders.size,
        revenue: v.revenue,
        aov: v.orders.size > 0 ? v.revenue / v.orders.size : 0,
        pctTotal: totalRev > 0 ? (v.revenue / totalRev) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [allActive]);

  const marcaSort = useSortable(marcaRows, "revenue" as any, "desc");
  const maxMarcaRevenue = Math.max(...marcaRows.map(r => r.revenue), 1);

  /* ── 4. Top 10 Estrellas ── */
  const estrellaRows = useMemo(() => {
    const map = new Map<string, { orders: Set<string>; revenue: number; lastDate: string; segment: string }>();
    for (const r of allActive) {
      const key = INVALID_ESTRELLA.includes(norm(r.estrella_nombre)) ? "Sin nombre" : r.estrella_nombre;
      if (!map.has(key)) map.set(key, { orders: new Set(), revenue: 0, lastDate: "", segment: "" });
      const e = map.get(key)!;
      e.orders.add(r.order_id);
      e.revenue += r.pvp_total * r.unidades;
      if (r.fecha_creacion > e.lastDate) { e.lastDate = r.fecha_creacion; e.segment = r.estrella_inactivity_segment; }
    }
    return [...map.entries()]
      .map(([estrella, v]) => ({
        estrella,
        ordenes: v.orders.size,
        revenue: v.revenue,
        aov: v.orders.size > 0 ? v.revenue / v.orders.size : 0,
        lastDate: v.lastDate,
        segment: v.segment,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [allActive]);

  const estrellaSort = useSortable(estrellaRows, "revenue" as any, "desc");

  const segmentBadge = (seg: string) => {
    const s = norm(seg);
    if (s === "disponible") return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-success/20 text-success">{seg}</span>;
    if (s === "ei1") return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-pending/20 text-pending">{seg}</span>;
    if (s === "ei2") return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-500/20 text-orange-400">{seg}</span>;
    if (s === "ei3") return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-destructive/20 text-destructive">{seg}</span>;
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">{seg || "—"}</span>;
  };

  /* ── 5. Top 20 Productos ── */
  const productoRows = useMemo(() => {
    const map = new Map<string, { marca: string; unidades: number; revenue: number; count: number; sumPvp: number }>();
    for (const r of allActive) {
      const p = r.producto;
      if (!p) continue;
      if (!map.has(p)) map.set(p, { marca: r.marca, unidades: 0, revenue: 0, count: 0, sumPvp: 0 });
      const e = map.get(p)!;
      e.unidades += r.unidades;
      e.revenue += r.pvp_total * r.unidades;
      e.count += r.unidades;
      e.sumPvp += r.pvp_total * r.unidades;
    }
    return [...map.entries()]
      .map(([producto, v]) => ({
        producto,
        marca: v.marca,
        unidades: v.unidades,
        revenue: v.revenue,
        precioPromedio: v.count > 0 ? v.sumPvp / v.count : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);
  }, [allActive]);

  const productoSort = useSortable(productoRows, "revenue" as any, "desc");

  /* ── KPI cards ── */
  const kpis: KPI[] = [
    { label: "Revenue PVP", value: fmt(metrics.totalRevenue), icon: DollarSign, color: "text-success", bg: "bg-success/10", tip: "SUM(PVP × Unidades) excl. cancelados, PVP>0" },
    { label: "Órdenes", value: num(metrics.totalOrdenes), icon: ShoppingCart, color: "text-process", bg: "bg-process/10", tip: "COUNT DISTINCT order_id activas" },
    { label: "AOV", value: fmt(metrics.aov), icon: TrendingUp, color: "text-pending", bg: "bg-pending/10", tip: "Revenue / Órdenes" },
    { label: "Margen Neto Prom.", value: fmt(metrics.margenProm), icon: Activity, color: "text-process", bg: "bg-process/10", tip: "AVG(Margen_Neto_Operativo) en pesos" },
    { label: "Tasa de Éxito", value: `${metrics.tasaExito.toFixed(1)}%`, icon: Percent, color: "text-success", bg: "bg-success/10", tip: "Entregadas / Total órdenes × 100" },
    { label: "Estrellas Activas", value: num(metrics.estrellas), icon: Users, color: "text-pending", bg: "bg-pending/10", tip: "COUNT DISTINCT estrella activas (excl. vacío)" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight mb-1">Visión General</h2>
        <div className="h-px bg-border" />
      </div>

      {/* ── Filter row ── */}
      <Card className="border border-border">
        <CardContent className="px-3 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2 items-end">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Marca</label>
              <MultiSelect options={uniqueMarcas} selected={fMarcas} onChange={setFMarcas} placeholder="Todas" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Producto</label>
              <MultiSelect options={uniqueProductos} selected={fProductos} onChange={setFProductos} placeholder="Todos" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Estrella</label>
              <MultiSelect options={uniqueEstrellas} selected={fEstrellas} onChange={setFEstrellas} placeholder="Todas" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Semana</label>
              <MultiSelect
                options={uniqueSemanas}
                selected={fSemanas}
                onChange={setFSemanas}
                placeholder="Todas"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Desde</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("h-8 w-full justify-start text-xs font-normal px-2", !fDesde && "text-muted-foreground")}>
                    <CalendarIcon className="h-3 w-3 mr-1.5" />
                    {fDesde ? format(fDesde, "dd/MM/yyyy") : "Desde"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={fDesde} onSelect={setFDesde} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Hasta</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("h-8 w-full justify-start text-xs font-normal px-2", !fHasta && "text-muted-foreground")}>
                    <CalendarIcon className="h-3 w-3 mr-1.5" />
                    {fHasta ? format(fHasta, "dd/MM/yyyy") : "Hasta"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={fHasta} onSelect={setFHasta} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Cliente</label>
                <Input
                  value={fCliente}
                  onChange={e => setFCliente(e.target.value)}
                  placeholder="Buscar cliente…"
                  className="h-8 text-xs"
                />
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground shrink-0">
                  <X className="h-3 w-3" /> Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">{k.label}</p>
                        <p className="text-[22px] font-bold tracking-tight leading-tight mt-0.5">{k.value}</p>
                      </div>
                      <div className={`rounded-md p-1.5 ${k.bg} shrink-0`}>
                        <k.icon className={`h-3.5 w-3.5 ${k.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-[200px]">{k.tip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {/* 1. Resumen por Mes */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Resumen por Mes</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <SortHeaderLeft label="Mes" active={mesSort.sortKey === "mes"} dir={mesSort.sortDir} onClick={() => mesSort.toggle("mes" as any)} />
                <SortHeader label="Órdenes" active={mesSort.sortKey === "ordenes"} dir={mesSort.sortDir} onClick={() => mesSort.toggle("ordenes" as any)} />
                <SortHeader label="Revenue PVP" active={mesSort.sortKey === "revenue"} dir={mesSort.sortDir} onClick={() => mesSort.toggle("revenue" as any)} />
                <SortHeader label="AOV" active={mesSort.sortKey === "aov"} dir={mesSort.sortDir} onClick={() => mesSort.toggle("aov" as any)} />
                <SortHeader label="Tasa Éxito %" active={mesSort.sortKey === "tasaExito"} dir={mesSort.sortDir} onClick={() => mesSort.toggle("tasaExito" as any)} />
                <th className="pb-1.5 pl-3 text-left font-medium text-muted-foreground">Proporción</th>
              </tr>
            </thead>
            <tbody>
              {mesSort.sorted.map((r) => (
                <tr key={r.mes} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5 text-foreground font-medium">{r.mes}</td>
                  <td className="py-1.5 text-right font-bold text-foreground">{num(r.ordenes)}</td>
                  <td className="py-1.5 text-right font-medium text-foreground">{fmt(r.revenue)}</td>
                  <td className="py-1.5 text-right text-foreground">{fmt(r.aov)}</td>
                  <td className="py-1.5 text-right text-foreground">{pct(r.tasaExito)}</td>
                  <td className="py-1.5 pl-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-[hsl(var(--chart-purple))]" style={{ width: `${(r.revenue / maxMesRevenue) * 100}%` }} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-border font-bold">
                <td className="py-1.5 text-foreground">Total</td>
                <td className="py-1.5 text-right text-foreground">{num(mesTotals.ordenes)}</td>
                <td className="py-1.5 text-right text-foreground">{fmt(mesTotals.revenue)}</td>
                <td className="py-1.5 text-right text-foreground">{fmt(mesTotals.aov)}</td>
                <td className="py-1.5 text-right text-foreground">—</td>
                <td />
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 2. Evolución de Revenue */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Evolución de Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {lineData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tickFormatter={(v: number) => `$${(v / 1e6).toFixed(1)}M`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <RTooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [fmt(v), "Revenue"]}
                />
                <Line type="monotone" dataKey="revenue" stroke="hsl(270 60% 55%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(270 60% 55%)" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 3. Top 10 Marcas */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Top 10 Marcas</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <SortHeaderLeft label="Marca" active={marcaSort.sortKey === "marca"} dir={marcaSort.sortDir} onClick={() => marcaSort.toggle("marca" as any)} />
                <SortHeader label="Órdenes" active={marcaSort.sortKey === "ordenes"} dir={marcaSort.sortDir} onClick={() => marcaSort.toggle("ordenes" as any)} />
                <th className="pb-1.5 text-right font-medium text-muted-foreground">Revenue</th>
                <SortHeader label="AOV" active={marcaSort.sortKey === "aov"} dir={marcaSort.sortDir} onClick={() => marcaSort.toggle("aov" as any)} />
                <SortHeader label="% del total" active={marcaSort.sortKey === "pctTotal"} dir={marcaSort.sortDir} onClick={() => marcaSort.toggle("pctTotal" as any)} />
              </tr>
            </thead>
            <tbody>
              {marcaSort.sorted.map((r) => (
                <tr key={r.marca} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5 text-foreground font-medium">{r.marca}</td>
                  <td className="py-1.5 text-right font-bold text-foreground">{num(r.ordenes)}</td>
                  <td className="py-1.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-[hsl(var(--chart-purple))]" style={{ width: `${(r.revenue / maxMarcaRevenue) * 100}%` }} />
                      </div>
                      <span className="font-medium text-foreground">{fmt(r.revenue)}</span>
                    </div>
                  </td>
                  <td className="py-1.5 text-right text-foreground">{fmt(r.aov)}</td>
                  <td className="py-1.5 text-right text-foreground">{pct(r.pctTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 4. Top 10 Estrellas */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Top 10 Estrellas</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <SortHeaderLeft label="Estrella" active={estrellaSort.sortKey === "estrella"} dir={estrellaSort.sortDir} onClick={() => estrellaSort.toggle("estrella" as any)} />
                <SortHeader label="Órdenes" active={estrellaSort.sortKey === "ordenes"} dir={estrellaSort.sortDir} onClick={() => estrellaSort.toggle("ordenes" as any)} />
                <SortHeader label="Revenue" active={estrellaSort.sortKey === "revenue"} dir={estrellaSort.sortDir} onClick={() => estrellaSort.toggle("revenue" as any)} />
                <SortHeader label="AOV" active={estrellaSort.sortKey === "aov"} dir={estrellaSort.sortDir} onClick={() => estrellaSort.toggle("aov" as any)} />
                <SortHeaderLeft label="Último pedido" active={estrellaSort.sortKey === "lastDate"} dir={estrellaSort.sortDir} onClick={() => estrellaSort.toggle("lastDate" as any)} />
                <th className="pb-1.5 text-left font-medium text-muted-foreground">Segmento</th>
              </tr>
            </thead>
            <tbody>
              {estrellaSort.sorted.map((r) => (
                <tr key={r.estrella} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5 text-foreground font-medium">{displayEstrella(r.estrella)}</td>
                  <td className="py-1.5 text-right font-bold text-foreground">{num(r.ordenes)}</td>
                  <td className="py-1.5 text-right font-medium text-foreground">{fmt(r.revenue)}</td>
                  <td className="py-1.5 text-right text-foreground">{fmt(r.aov)}</td>
                  <td className="py-1.5 text-foreground">{formatDateDMY(r.lastDate)}</td>
                  <td className="py-1.5">{segmentBadge(r.segment)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 5. Top 20 Productos */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Top 20 Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <SortHeaderLeft label="Producto" active={productoSort.sortKey === "producto"} dir={productoSort.sortDir} onClick={() => productoSort.toggle("producto" as any)} />
                <SortHeaderLeft label="Marca" active={productoSort.sortKey === "marca"} dir={productoSort.sortDir} onClick={() => productoSort.toggle("marca" as any)} />
                <SortHeader label="Uds. vendidas" active={productoSort.sortKey === "unidades"} dir={productoSort.sortDir} onClick={() => productoSort.toggle("unidades" as any)} />
                <SortHeader label="Revenue" active={productoSort.sortKey === "revenue"} dir={productoSort.sortDir} onClick={() => productoSort.toggle("revenue" as any)} />
                <SortHeader label="Precio prom." active={productoSort.sortKey === "precioPromedio"} dir={productoSort.sortDir} onClick={() => productoSort.toggle("precioPromedio" as any)} />
              </tr>
            </thead>
            <tbody>
              {productoSort.sorted.map((r, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5 text-foreground font-medium max-w-[250px] truncate">{r.producto}</td>
                  <td className="py-1.5 text-foreground">{r.marca}</td>
                  <td className="py-1.5 text-right font-bold text-foreground">{num(r.unidades)}</td>
                  <td className="py-1.5 text-right font-medium text-foreground">{fmt(r.revenue)}</td>
                  <td className="py-1.5 text-right text-foreground">{fmt(r.precioPromedio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PanoramaSection;
