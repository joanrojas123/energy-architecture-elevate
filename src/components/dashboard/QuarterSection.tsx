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

const MESES_LABEL: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-3">
    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{title}</h3>
    <div className="h-px flex-1 bg-border" />
  </div>
);

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const EN_PROCESO = new Set(["en camino", "en reparto", "en bodega destino", "despachada",
  "en ruta", "novedad", "en reexpedicion", "en espera de ruta domestica",
  "en terminal origen", "pendiente", "guía generada", "guia anulada",
  "creada", "pendiente confirmacion"]);

const QuarterSection = ({ data }: Props) => {
  const [selAnio, setSelAnio] = useState<string[]>([]);
  const [selMes, setSelMes] = useState<string[]>([]);
  const [selQuarter, setSelQuarter] = useState<string[]>([]);
  const [selEstado, setSelEstado] = useState<string[]>([]);
  const [selMarca, setSelMarca] = useState<string[]>([]);
  const [selEstrella, setSelEstrella] = useState<string[]>([]);
  const [selTransp, setSelTransp] = useState<string[]>([]);
  const [selRate, setSelRate] = useState<string[]>([]);

  const anios = useMemo(() =>
    [...new Set(data.map(r => r.mes_id?.slice(0, 4)).filter(Boolean))].sort(), [data]);
  const meses = useMemo(() =>
    [...new Set(data.map(r => r.mes_id).filter(Boolean))].sort(), [data]);
  const mesLabels = useMemo(() =>
    meses.map(m => {
      const [y, mo] = m.split("-");
      return { value: m, label: `${MESES_LABEL[mo] || mo} ${y}` };
    }), [meses]);
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

  const hasFilters = selAnio.length || selMes.length || selQuarter.length || selEstado.length ||
    selMarca.length || selEstrella.length || selTransp.length || selRate.length;

  const clearAll = () => {
    setSelAnio([]); setSelMes([]); setSelQuarter([]); setSelEstado([]);
    setSelMarca([]); setSelEstrella([]); setSelTransp([]); setSelRate([]);
  };

  const filtered = useMemo(() => {
    let d = data;
    if (selAnio.length) d = d.filter(r => selAnio.includes(r.mes_id?.slice(0, 4) || ""));
    if (selMes.length) d = d.filter(r => selMes.includes(r.mes_id));
    if (selQuarter.length) d = d.filter(r => selQuarter.includes(r.quarter));
    if (selEstado.length) d = d.filter(r => selEstado.includes(norm(r.estado_actual)));
    if (selMarca.length) d = d.filter(r => selMarca.includes(r.marca));
    if (selEstrella.length) d = d.filter(r => selEstrella.includes(r.estrella_nombre));
    if (selTransp.length) d = d.filter(r => selTransp.includes(r.shipping_company));
    if (selRate.length) d = d.filter(r => selRate.includes(r.rate_type));
    return d;
  }, [data, selAnio, selMes, selQuarter, selEstado, selMarca, selEstrella, selTransp, selRate]);

  const kpis = useMemo(() => {
    const ordenes = new Set(filtered.map(r => r.order_id));
    const activos = filtered.filter(r => !EXCLUIDOS.includes(norm(r.estado_actual)));
    const activosIds = new Set(activos.map(r => r.order_id));
    const revenue = activos.reduce((s, r) => s + r.pvp_total * r.unidades, 0);
    const unidades = activos.reduce((s, r) => s + r.unidades, 0);
    const entregadas = new Set(filtered.filter(r => norm(r.estado_actual) === "entregado").map(r => r.order_id));
    const canceladas = new Set(filtered.filter(r => EXCLUIDOS.includes(norm(r.estado_actual))).map(r => r.order_id));
    const devoluciones = new Set(filtered.filter(r => norm(r.estado_actual) === "devolucion").map(r => r.order_id));
    const enProceso = new Set(filtered.filter(r => EN_PROCESO.has(norm(r.estado_actual))).map(r => r.order_id));
    const tasa = ordenes.size > 0 ? (entregadas.size / ordenes.size) * 100 : 0;
    const aov = activosIds.size > 0 ? revenue / activosIds.size : 0;
    const marcasU = new Set(activos.map(r => r.marca).filter(Boolean));
    const estrellasU = new Set(activos.map(r => r.estrella_nombre || "sin_nombre"));
    // Recaudo
    const conRecaudo = new Set(filtered.filter(r => norm(r.rate_type) === "con recaudo").map(r => r.order_id));
    const sinRecaudo = new Set(filtered.filter(r => norm(r.rate_type) === "sin recaudo").map(r => r.order_id));
    return {
      total: ordenes.size, activos: activosIds.size, revenue, unidades,
      entregadas: entregadas.size, canceladas: canceladas.size,
      devoluciones: devoluciones.size, enProceso: enProceso.size,
      tasa, aov, marcas: marcasU.size, estrellas: estrellasU.size,
      conRecaudo: conRecaudo.size, sinRecaudo: sinRecaudo.size,
    };
  }, [filtered]);

  const funnelData = useMemo(() => {
    const total = new Set(filtered.map(r => r.order_id)).size;
    const entregadas = new Set(filtered.filter(r => norm(r.estado_actual) === "entregado").map(r => r.order_id)).size;
    const proceso = new Set(filtered.filter(r => EN_PROCESO.has(norm(r.estado_actual))).map(r => r.order_id)).size;
    const devoluciones = new Set(filtered.filter(r => norm(r.estado_actual) === "devolucion").map(r => r.order_id)).size;
    const canceladas = new Set(filtered.filter(r => EXCLUIDOS.includes(norm(r.estado_actual))).map(r => r.order_id)).size;
    return [
      { name: "Total Órdenes", value: total, pct: 100, fill: "#6366f1" },
      { name: "En Proceso", value: proceso, pct: total ? proceso / total * 100 : 0, fill: "#3b82f6" },
      { name: "Entregadas", value: entregadas, pct: total ? entregadas / total * 100 : 0, fill: "#22c55e" },
      { name: "Devoluciones", value: devoluciones, pct: total ? devoluciones / total * 100 : 0, fill: "#f59e0b" },
      { name: "Canceladas/Rechazadas", value: canceladas, pct: total ? canceladas / total * 100 : 0, fill: "#ef4444" },
    ];
  }, [filtered]);

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
      .map(([estado, v]) => ({ estado, ordenes: v.ordenes.size, revenue: v.revenue, pct: total ? v.ordenes.size / total * 100 : 0 }))
      .sort((a, b) => b.ordenes - a.ordenes);
  }, [filtered]);

  // Comparativo Q vs Q — etiqueta incluye año si hay múltiples años seleccionados
  const multiAnio = selAnio.length !== 1;
  const quarterComp = useMemo(() => {
    let base = data;
    if (selAnio.length) base = base.filter(r => selAnio.includes(r.mes_id?.slice(0, 4) || ""));
    if (selMes.length) base = base.filter(r => selMes.includes(r.mes_id));
    if (selMarca.length) base = base.filter(r => selMarca.includes(r.marca));
    if (selEstrella.length) base = base.filter(r => selEstrella.includes(r.estrella_nombre));
    if (selTransp.length) base = base.filter(r => selTransp.includes(r.shipping_company));
    if (selRate.length) base = base.filter(r => selRate.includes(r.rate_type));

    // Si hay múltiples años, desagregamos Q1-2025, Q1-2026, etc.
    const keys: { q: string; anio: string; label: string }[] = [];
    const aniosBase = selAnio.length ? selAnio : anios;
    for (const a of aniosBase) {
      for (const q of QUARTERS) {
        const hasData = base.some(r => r.quarter === q && r.mes_id?.startsWith(a));
        if (hasData) keys.push({ q, anio: a, label: multiAnio ? `${q}-${a.slice(2)}` : q });
      }
    }

    return keys.map(({ q, anio, label }) => {
      const qrows = base.filter(r => r.quarter === q && r.mes_id?.startsWith(anio));
      const activos = qrows.filter(r => !EXCLUIDOS.includes(norm(r.estado_actual)));
      const ordenes = new Set(activos.map(r => r.order_id));
      const revenue = activos.reduce((s, r) => s + r.pvp_total * r.unidades, 0);
      const entregadas = new Set(activos.filter(r => norm(r.estado_actual) === "entregado").map(r => r.order_id));
      const canceladas = new Set(qrows.filter(r => EXCLUIDOS.includes(norm(r.estado_actual))).map(r => r.order_id));
      const tasa = ordenes.size > 0 ? entregadas.size / ordenes.size * 100 : 0;
      const aov = ordenes.size > 0 ? revenue / ordenes.size : 0;
      return { q: label, ordenes: ordenes.size, revenue, tasa, aov, entregadas: entregadas.size, canceladas: canceladas.size };
    });
  }, [data, selAnio, selMes, selMarca, selEstrella, selTransp, selRate, anios, multiAnio]);

  // Top marcas
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

  // Top estrellas
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
    { label: "EN PROCESO", value: kpis.enProceso.toLocaleString("es-CO"), color: "text-process" },
    { label: "DEVOLUCIONES", value: kpis.devoluciones.toLocaleString("es-CO"), color: "text-pending" },
    { label: "CANCELADAS", value: kpis.canceladas.toLocaleString("es-CO"), color: "text-error" },
    { label: "CON RECAUDO", value: kpis.conRecaudo.toLocaleString("es-CO"), color: "text-process" },
    { label: "SIN RECAUDO", value: kpis.sinRecaudo.toLocaleString("es-CO"), color: "text-muted-foreground" },
    { label: "AOV", value: fmt(kpis.aov), color: "text-foreground" },
    { label: "UNIDADES", value: kpis.unidades.toLocaleString("es-CO"), color: "text-foreground" },
    { label: "MARCAS", value: kpis.marcas.toLocaleString("es-CO"), color: "text-foreground" },
    { label: "ESTRELLAS", value: kpis.estrellas.toLocaleString("es-CO"), color: "text-foreground" },
  ];

  return (
    <div className="space-y-5">
      {/* Filtros */}
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
          <MultiSelect options={anios} selected={selAnio} onChange={setSelAnio} placeholder="Año" className="w-[120px]" />
          <MultiSelect
            options={mesLabels.map(m => m.value)}
            selected={selMes}
            onChange={setSelMes}
            placeholder="Mes"
            className="w-[140px]"
          />
          <MultiSelect options={QUARTERS} selected={selQuarter} onChange={setSelQuarter} placeholder="Quarter" className="w-[130px]" />
          <MultiSelect options={estados} selected={selEstado} onChange={setSelEstado} placeholder="Estado" className="w-[150px]" />
          <MultiSelect options={marcas} selected={selMarca} onChange={setSelMarca} placeholder="Marca" className="w-[150px]" />
          <MultiSelect options={estrellas} selected={selEstrella} onChange={setSelEstrella} placeholder="Estrella" className="w-[150px]" />
          <MultiSelect options={transps} selected={selTransp} onChange={setSelTransp} placeholder="Transportadora" className="w-[160px]" />
          <MultiSelect options={rates} selected={selRate} onChange={setSelRate} placeholder="Rate Type" className="w-[140px]" />
        </div>
      </div>

      {/* KPIs */}
      <SectionHeader title="Resumen del período" />
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-2">
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
                  <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Detalle por estado</p>
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
              {estadosTabla.map(e => (
                <div key={e.estado} className="flex items-center gap-2">
                  <span className="text-xs w-[150px] truncate font-medium">{e.estado}</span>
                  <div className="flex-1 bg-muted rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${e.pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-[28px] text-right">{e.ordenes}</span>
                  <span className="text-[10px] text-muted-foreground w-[38px] text-right">{pct(e.pct)}</span>
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
                <XAxis dataKey="q" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="ordenes" name="Activas" fill="hsl(var(--process))" radius={[4, 4, 0, 0]} />
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
                <XAxis dataKey="q" tick={{ fontSize: 10 }} />
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
                <XAxis dataKey="q" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v.toFixed(1)}%`, "Tasa"]} />
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
                <XAxis dataKey="q" tick={{ fontSize: 10 }} />
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
            <SectionHeader title="Top 10 Marcas" />
            <div className="mt-3 space-y-1.5 max-h-[320px] overflow-y-auto">
              <div className="grid grid-cols-4 text-[10px] font-semibold uppercase text-muted-foreground px-1 mb-2">
                <span className="col-span-2">Marca</span>
                <span className="text-right">Órdenes</span>
                <span className="text-right">Revenue</span>
              </div>
              {topMarcas.map((m, i) => (
                <div key={m.marca} className="grid grid-cols-4 items-center gap-1 px-1 py-1 rounded hover:bg-muted/50">
                  <span className="col-span-2 text-xs truncate font-medium">{i + 1}. {m.marca}</span>
                  <span className="text-xs text-right text-muted-foreground">{m.ordenes}</span>
                  <span className="text-xs text-right font-medium">{fmt(m.revenue)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <SectionHeader title="Top 10 Estrellas" />
            <div className="mt-3 space-y-1.5 max-h-[320px] overflow-y-auto">
              <div className="grid grid-cols-4 text-[10px] font-semibold uppercase text-muted-foreground px-1 mb-2">
                <span className="col-span-2">Estrella</span>
                <span className="text-right">Órdenes</span>
                <span className="text-right">Revenue</span>
              </div>
              {topEstrellas.map((e, i) => (
                <div key={e.estrella} className="grid grid-cols-4 items-center gap-1 px-1 py-1 rounded hover:bg-muted/50">
                  <span className="col-span-2 text-xs truncate font-medium">{i + 1}. {e.estrella}</span>
                  <span className="text-xs text-right text-muted-foreground">{e.ordenes}</span>
                  <span className="text-xs text-right font-medium">{fmt(e.revenue)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuarterSection;