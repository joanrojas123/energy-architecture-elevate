import { useMemo, useState } from "react";
import { type SalesRow } from "@/lib/csv-processor";
import { Card, CardContent } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, LineChart, Line, FunnelChart, Funnel, LabelList, Cell,
} from "recharts";

interface Props { data: SalesRow[] }

const EXCLUIDOS = ["cancelado", "rechazado"];
const norm = (s: string) => (s || "").trim().toLowerCase();
const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-3">
    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{title}</h3>
    <div className="h-px flex-1 bg-border" />
  </div>
);

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const FUNNEL_STAGES = [
  { key: "total", label: "Total Órdenes", color: "#6366f1" },
  { key: "proceso", label: "En Proceso", color: "#3b82f6" },
  { key: "entregadas", label: "Entregadas", color: "#22c55e" },
  { key: "devoluciones", label: "Devoluciones", color: "#f59e0b" },
  { key: "canceladas", label: "Canceladas/Rechazadas", color: "#ef4444" },
];

const EN_PROCESO = new Set(["en camino", "en reparto", "en bodega destino", "despachada",
  "en ruta", "novedad", "en reexpedicion", "en espera de ruta domestica",
  "en terminal origen", "pendiente", "guía generada", "guia anulada",
  "creada", "pendiente confirmacion"]);

const QuarterSection = ({ data }: Props) => {
  const [selQuarter, setSelQuarter] = useState<string[]>([]);
  const [selAnio, setSelAnio] = useState<string[]>([]);
  const [selEstado, setSelEstado] = useState<string[]>([]);
  const [selMarca, setSelMarca] = useState<string[]>([]);
  const [selEstrella, setSelEstrella] = useState<string[]>([]);
  const [selTransp, setSelTransp] = useState<string[]>([]);
  const [selRate, setSelRate] = useState<string[]>([]);

  // Opciones únicas
  const anios = useMemo(() =>
    [...new Set(data.map(r => r.mes_id?.slice(0, 4)).filter(Boolean))].sort(), [data]);
  const estados = useMemo(() =>
    [...new Set(data.map(r => norm(r.estado_actual)).filter(Boolean))].sort(), [data]);
  const marcas = useMemo(() =>
    [...new Set(data.map(r => r.marca).filter(Boolean))].sort(), [data]);
  const estrellas = useMemo(() =>
    [...new Set(data.map(r => r.estrella_nombre).filter(Boolean))].sort(), [data]);
  const transps = useMemo(() =>
    [...new Set(data.map(r => r.shipping_company).filter(Boolean))].sort(), [data]);
  const rates = useMemo(() =>
    [...new Set(data.map(r => r.rate_type).filter(Boolean))].sort(), [data]);

  const hasFilters = selQuarter.length || selAnio.length || selEstado.length ||
    selMarca.length || selEstrella.length || selTransp.length || selRate.length;

  const clearAll = () => {
    setSelQuarter([]); setSelAnio([]); setSelEstado([]);
    setSelMarca([]); setSelEstrella([]); setSelTransp([]); setSelRate([]);
  };

  // Datos filtrados
  const filtered = useMemo(() => {
    let d = data;
    if (selAnio.length) d = d.filter(r => selAnio.includes(r.mes_id?.slice(0, 4) || ""));
    if (selQuarter.length) d = d.filter(r => selQuarter.includes(r.quarter));
    if (selEstado.length) d = d.filter(r => selEstado.includes(norm(r.estado_actual)));
    if (selMarca.length) d = d.filter(r => selMarca.includes(r.marca));
    if (selEstrella.length) d = d.filter(r => selEstrella.includes(r.estrella_nombre));
    if (selTransp.length) d = d.filter(r => selTransp.includes(r.shipping_company));
    if (selRate.length) d = d.filter(r => selRate.includes(r.rate_type));
    return d;
  }, [data, selAnio, selQuarter, selEstado, selMarca, selEstrella, selTransp, selRate]);

  // KPIs del período filtrado (sin excluir estados — muestra todo lo seleccionado)
  const kpis = useMemo(() => {
    const ordenes = new Set(filtered.map(r => r.order_id));
    const activos = filtered.filter(r => !EXCLUIDOS.includes(norm(r.estado_actual)));
    const activosIds = new Set(activos.map(r => r.order_id));
    const revenue = activos.reduce((s, r) => s + r.pvp_total * r.unidades, 0);
    const unidades = activos.reduce((s, r) => s + r.unidades, 0);
    const entregadas = new Set(filtered.filter(r => norm(r.estado_actual) === "entregado").map(r => r.order_id));
    const canceladas = new Set(filtered.filter(r => EXCLUIDOS.includes(norm(r.estado_actual))).map(r => r.order_id));
    const devoluciones = new Set(filtered.filter(r => norm(r.estado_actual) === "devolucion").map(r => r.order_id));
    const tasa = ordenes.size > 0 ? (entregadas.size / ordenes.size) * 100 : 0;
    const aov = activosIds.size > 0 ? revenue / activosIds.size : 0;
    const marcasU = new Set(activos.map(r => r.marca).filter(Boolean));
    const estrellasU = new Set(activos.map(r => r.estrella_nombre || "sin_nombre"));
    return {
      total: ordenes.size, activos: activosIds.size, revenue, unidades,
      entregadas: entregadas.size, canceladas: canceladas.size,
      devoluciones: devoluciones.size, tasa, aov,
      marcas: marcasU.size, estrellas: estrellasU.size,
    };
  }, [filtered]);

  // Funnel data
  const funnelData = useMemo(() => {
    const ordenes = new Set(filtered.map(r => r.order_id));
    const entregadas = new Set(filtered.filter(r => norm(r.estado_actual) === "entregado").map(r => r.order_id));
    const proceso = new Set(filtered.filter(r => EN_PROCESO.has(norm(r.estado_actual))).map(r => r.order_id));
    const devoluciones = new Set(filtered.filter(r => norm(r.estado_actual) === "devolucion").map(r => r.order_id));
    const canceladas = new Set(filtered.filter(r => EXCLUIDOS.includes(norm(r.estado_actual))).map(r => r.order_id));
    const total = ordenes.size;
    return [
      { name: "Total Órdenes", value: total, pct: 100, fill: "#6366f1" },
      { name: "En Proceso", value: proceso.size, pct: total ? proceso.size / total * 100 : 0, fill: "#3b82f6" },
      { name: "Entregadas", value: entregadas.size, pct: total ? entregadas.size / total * 100 : 0, fill: "#22c55e" },
      { name: "Devoluciones", value: devoluciones.size, pct: total ? devoluciones.size / total * 100 : 0, fill: "#f59e0b" },
      { name: "Canceladas/Rechazadas", value: canceladas.size, pct: total ? canceladas.size / total * 100 : 0, fill: "#ef4444" },
    ];
  }, [filtered]);

  // Tabla de estados detallada
  const estadosTabla = useMemo(() => {
    const map: Record<string, { ordenes: Set<string>; revenue: number }> = {};
    for (const r of filtered) {
      const e = norm(r.estado_actual) || "sin estado";
      if (!map[e]) map[e] = { ordenes: new Set(), revenue: 0 };
      map[e].ordenes.add(r.order_id);
      if (!EXCLUIDOS.includes(e)) map[e].revenue += r.pvp_total * r.unidades;
    }
    const total = new Set(filtered.map(r => r.order_id)).size;
    return Object.entries(map)
      .map(([estado, v]) => ({
        estado, ordenes: v.ordenes.size, revenue: v.revenue,
        pct: total ? v.ordenes.size / total * 100 : 0,
      }))
      .sort((a, b) => b.ordenes - a.ordenes);
  }, [filtered]);

  // Comparativo Q vs Q (siempre sobre rawData filtrado por año/transp/rate/marca/estrella pero no por Q)
  const quarterComp = useMemo(() => {
    let base = data;
    if (selAnio.length) base = base.filter(r => selAnio.includes(r.mes_id?.slice(0, 4) || ""));
    if (selMarca.length) base = base.filter(r => selMarca.includes(r.marca));
    if (selEstrella.length) base = base.filter(r => selEstrella.includes(r.estrella_nombre));
    if (selTransp.length) base = base.filter(r => selTransp.includes(r.shipping_company));
    if (selRate.length) base = base.filter(r => selRate.includes(r.rate_type));
    return QUARTERS.map(q => {
      const qrows = base.filter(r => r.quarter === q);
      const activos = qrows.filter(r => !EXCLUIDOS.includes(norm(r.estado_actual)));
      const ordenes = new Set(activos.map(r => r.order_id));
      const revenue = activos.reduce((s, r) => s + r.pvp_total * r.unidades, 0);
      const entregadas = new Set(activos.filter(r => norm(r.estado_actual) === "entregado").map(r => r.order_id));
      const canceladas = new Set(qrows.filter(r => EXCLUIDOS.includes(norm(r.estado_actual))).map(r => r.order_id));
      const tasa = ordenes.size > 0 ? entregadas.size / ordenes.size * 100 : 0;
      const aov = ordenes.size > 0 ? revenue / ordenes.size : 0;
      return { q, ordenes: ordenes.size, revenue, tasa, aov, entregadas: entregadas.size, canceladas: canceladas.size };
    });
  }, [data, selAnio, selMarca, selEstrella, selTransp, selRate]);

  // Top marcas y estrellas
  const topMarcas = useMemo(() => {
    const activos = filtered.filter(r => !EXCLUIDOS.includes(norm(r.estado_actual)));
    const map: Record<string, { revenue: number; ordenes: Set<string> }> = {};
    for (const r of activos) {
      const m = r.marca || "Sin marca";
      if (!map[m]) map[m] = { revenue: 0, ordenes: new Set() };
      map[m].revenue += r.pvp_total * r.unidades;
      map[m].ordenes.add(r.order_id);
    }
    return Object.entries(map)
      .map(([marca, v]) => ({ marca, revenue: v.revenue, ordenes: v.ordenes.size }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filtered]);

  const topEstrellas = useMemo(() => {
    const activos = filtered.filter(r => !EXCLUIDOS.includes(norm(r.estado_actual)));
    const map: Record<string, { revenue: number; ordenes: Set<string> }> = {};
    for (const r of activos) {
      const e = r.estrella_nombre || "Sin nombre";
      if (!map[e]) map[e] = { revenue: 0, ordenes: new Set() };
      map[e].revenue += r.pvp_total * r.unidades;
      map[e].ordenes.add(r.order_id);
    }
    return Object.entries(map)
      .map(([estrella, v]) => ({ estrella, revenue: v.revenue, ordenes: v.ordenes.size }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filtered]);

  const kpiDefs = [
    { label: "TOTAL ÓRDENES", value: kpis.total.toLocaleString("es-CO"), color: "text-foreground" },
    { label: "REVENUE PVP", value: fmt(kpis.revenue), color: "text-success" },
    { label: "ENTREGADAS", value: `${kpis.entregadas} (${pct(kpis.tasa)})`, color: "text-success" },
    { label: "EN PROCESO", value: (kpis.total - kpis.entregadas - kpis.canceladas - kpis.devoluciones).toLocaleString("es-CO"), color: "text-process" },
    { label: "DEVOLUCIONES", value: kpis.devoluciones.toLocaleString("es-CO"), color: "text-pending" },
    { label: "CANCELADAS", value: kpis.canceladas.toLocaleString("es-CO"), color: "text-error" },
    { label: "AOV", value: fmt(kpis.aov), color: "text-foreground" },
    { label: "UNIDADES", value: kpis.unidades.toLocaleString("es-CO"), color: "text-foreground" },
  ];

  return (
    <div className="space-y-5">
      {/* Filtros multi-select */}
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Filtros</span>
          {hasFilters ? (
            <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs text-muted-foreground" onClick={clearAll}>
              <X className="mr-1 h-3 w-3" /> Limpiar
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <MultiSelect options={anios} selected={selAnio} onChange={setSelAnio} placeholder="Año" className="w-[130px]" />
          <MultiSelect options={QUARTERS} selected={selQuarter} onChange={setSelQuarter} placeholder="Quarter" className="w-[130px]" />
          <MultiSelect options={estados} selected={selEstado} onChange={setSelEstado} placeholder="Estado" className="w-[160px]" />
          <MultiSelect options={marcas} selected={selMarca} onChange={setSelMarca} placeholder="Marca" className="w-[160px]" />
          <MultiSelect options={estrellas} selected={selEstrella} onChange={setSelEstrella} placeholder="Estrella" className="w-[160px]" />
          <MultiSelect options={transps} selected={selTransp} onChange={setSelTransp} placeholder="Transportadora" className="w-[170px]" />
          <MultiSelect options={rates} selected={selRate} onChange={setSelRate} placeholder="Rate Type" className="w-[150px]" />
        </div>
      </div>

      {/* KPIs */}
      <SectionHeader title="Resumen del período" />
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
        {kpiDefs.map(k => (
          <Card key={k.label} className="border border-border shadow-sm">
            <CardContent className="px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">{k.label}</p>
              <p className={`text-[16px] font-bold tracking-tight leading-tight mt-0.5 ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Funnel */}
      <SectionHeader title="Funnel de conversión" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Gráfico funnel */}
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Embudo visual</p>
            <ResponsiveContainer width="100%" height={280}>
              <FunnelChart>
                <RTooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number, _: string, props: any) => [`${v} órdenes (${props.payload.pct.toFixed(1)}%)`, props.payload.name]}
                />
                <Funnel dataKey="value" data={funnelData} isAnimationActive>
                  {funnelData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" className="text-[11px]" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tabla de estados */}
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Detalle por estado</p>
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
              {estadosTabla.map(e => (
                <div key={e.estado} className="flex items-center gap-2">
                  <span className="text-xs w-[160px] truncate text-foreground font-medium">{e.estado}</span>
                  <div className="flex-1 bg-muted rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${e.pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-[30px] text-right">{e.ordenes}</span>
                  <span className="text-[10px] text-muted-foreground w-[40px] text-right">{pct(e.pct)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Q vs Q */}
      <SectionHeader title="Comparativo Q vs Q" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Órdenes por Quarter</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={quarterComp}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="q" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="ordenes" name="Órdenes activas" fill="hsl(var(--process))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="entregadas" name="Entregadas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="canceladas" name="Canceladas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Revenue por Quarter</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={quarterComp}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="q" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} />
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [fmt(v), "Revenue"]} />
                <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--pending))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Tasa de Éxito por Quarter (%)</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={quarterComp}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="q" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v.toFixed(1)}%`, "Tasa Éxito"]} />
                <Line type="monotone" dataKey="tasa" name="Tasa Éxito" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">AOV por Quarter</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={quarterComp}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="q" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [fmt(v), "AOV"]} />
                <Line type="monotone" dataKey="aov" name="AOV" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Marcas y Estrellas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <SectionHeader title="Top 10 Marcas por Revenue" />
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topMarcas} layout="vertical" margin={{ left: 10, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} />
                  <YAxis type="category" dataKey="marca" tick={{ fontSize: 10 }} width={100} />
                  <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [fmt(v), "Revenue"]} />
                  <Bar dataKey="revenue" fill="hsl(var(--process))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <SectionHeader title="Top 10 Estrellas por Revenue" />
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topEstrellas} layout="vertical" margin={{ left: 10, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} />
                  <YAxis type="category" dataKey="estrella" tick={{ fontSize: 10 }} width={100} />
                  <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [fmt(v), "Revenue"]} />
                  <Bar dataKey="revenue" fill="hsl(var(--pending))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuarterSection;