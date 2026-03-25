import { useMemo, useState } from "react";
import { type SalesRow } from "@/lib/csv-processor";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, LineChart, Line, Legend,
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

const QuarterSection = ({ data }: Props) => {
  const [selectedQ, setSelectedQ] = useState("all");
  const [selectedAnio, setSelectedAnio] = useState("all");

  const anios = useMemo(() =>
    [...new Set(data.map(r => r.mes_id?.slice(0, 4)).filter(Boolean))].sort(),
    [data]
  );

  const filtered = useMemo(() => {
    let d = data;
    if (selectedAnio !== "all") d = d.filter(r => r.mes_id?.startsWith(selectedAnio));
    if (selectedQ !== "all") d = d.filter(r => r.quarter === selectedQ);
    return d;
  }, [data, selectedQ, selectedAnio]);

  // KPIs globales del filtro actual
  const kpis = useMemo(() => {
    const activos = filtered.filter(r => !EXCLUIDOS.includes(norm(r.estado_actual)));
    const ordenes = new Set(activos.map(r => r.order_id));
    const unidades = activos.reduce((s, r) => s + r.unidades, 0);
    const revenue = activos.reduce((s, r) => s + r.pvp_total * r.unidades, 0);
    const entregadas = new Set(activos.filter(r => norm(r.estado_actual) === "entregado").map(r => r.order_id));
    const tasa = ordenes.size > 0 ? (entregadas.size / ordenes.size) * 100 : 0;
    const aov = ordenes.size > 0 ? revenue / ordenes.size : 0;
    const marcas = new Set(activos.map(r => r.marca).filter(Boolean));
    const estrellas = new Set(activos.map(r => r.estrella_nombre || "sin_nombre"));
    return { ordenes: ordenes.size, unidades, revenue, tasa, aov, entregadas: entregadas.size, marcas: marcas.size, estrellas: estrellas.size };
  }, [filtered]);

  // Comparativo por Quarter
  const quarterData = useMemo(() =>
    QUARTERS.map(q => {
      let d = data;
      if (selectedAnio !== "all") d = d.filter(r => r.mes_id?.startsWith(selectedAnio));
      const qrows = d.filter(r => r.quarter === q);
      const activos = qrows.filter(r => !EXCLUIDOS.includes(norm(r.estado_actual)));
      const ordenes = new Set(activos.map(r => r.order_id));
      const revenue = activos.reduce((s, r) => s + r.pvp_total * r.unidades, 0);
      const entregadas = new Set(activos.filter(r => norm(r.estado_actual) === "entregado").map(r => r.order_id));
      const tasa = ordenes.size > 0 ? (entregadas.size / ordenes.size) * 100 : 0;
      const aov = ordenes.size > 0 ? revenue / ordenes.size : 0;
      return { q, ordenes: ordenes.size, revenue, tasa, aov, entregadas: entregadas.size };
    }),
    [data, selectedAnio]
  );

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
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
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
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filtered]);

  const kpiDefs = [
    { label: "ÓRDENES", value: kpis.ordenes.toLocaleString("es-CO") },
    { label: "REVENUE PVP", value: fmt(kpis.revenue) },
    { label: "ENTREGADAS", value: kpis.entregadas.toLocaleString("es-CO") },
    { label: "TASA ÉXITO", value: pct(kpis.tasa) },
    { label: "AOV", value: fmt(kpis.aov) },
    { label: "UNIDADES", value: kpis.unidades.toLocaleString("es-CO") },
    { label: "MARCAS", value: kpis.marcas.toLocaleString("es-CO") },
    { label: "ESTRELLAS", value: kpis.estrellas.toLocaleString("es-CO") },
  ];

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedAnio} onValueChange={setSelectedAnio}>
          <SelectTrigger className="h-8 w-[130px] bg-background text-xs">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los años</SelectItem>
            {anios.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedQ} onValueChange={setSelectedQ}>
          <SelectTrigger className="h-8 w-[130px] bg-background text-xs">
            <SelectValue placeholder="Quarter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los Q</SelectItem>
            {QUARTERS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <SectionHeader title="Resumen del período" />
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
        {kpiDefs.map(k => (
          <Card key={k.label} className="border border-border shadow-sm">
            <CardContent className="px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">{k.label}</p>
              <p className="text-[18px] font-bold tracking-tight leading-tight mt-0.5">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparativo Q vs Q */}
      <SectionHeader title="Comparativo Q vs Q" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Órdenes por Quarter</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={quarterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="q" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="ordenes" name="Órdenes" fill="hsl(var(--process))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="entregadas" name="Entregadas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Revenue por Quarter</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={quarterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="q" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000000).toFixed(1)}M`} />
                <RTooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [fmt(v), "Revenue"]}
                />
                <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--pending))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tasa éxito y AOV por Q */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Tasa de Éxito por Quarter (%)</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={quarterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="q" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <RTooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`${v.toFixed(1)}%`, "Tasa Éxito"]}
                />
                <Line type="monotone" dataKey="tasa" name="Tasa Éxito" stroke="#27ae60" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">AOV por Quarter</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={quarterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="q" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                <RTooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [fmt(v), "AOV"]}
                />
                <Line type="monotone" dataKey="aov" name="AOV" stroke="#3498db" strokeWidth={2} dot={{ r: 4 }} />
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
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000000).toFixed(1)}M`} />
                  <YAxis type="category" dataKey="marca" tick={{ fontSize: 10 }} width={100} />
                  <RTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [fmt(v), "Revenue"]}
                  />
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
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000000).toFixed(1)}M`} />
                  <YAxis type="category" dataKey="estrella" tick={{ fontSize: 10 }} width={100} />
                  <RTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [fmt(v), "Revenue"]}
                  />
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