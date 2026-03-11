import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Loader2, Zap, Target, Eye } from "lucide-react";

/* ── Types ── */
interface FilterOptions {
  anios: number[];
  meses: number[];
  semanas: number[];
  transportadoras: string[];
  proveedores: string[];
  ciudades: string[];
}

const ATRIB_COLORS: Record<string, string> = {
  "Marca": "hsl(var(--pending))",
  "Proveedor": "hsl(var(--pending))",
  "Marca/Proveedor": "hsl(var(--pending))",
  "Transportadora": "hsl(var(--destructive))",
  "Logística Interna": "hsl(var(--process))",
  "Logística": "hsl(var(--process))",
};

const getAtribColor = (responsable: string) => {
  for (const [key, color] of Object.entries(ATRIB_COLORS)) {
    if (responsable?.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return "hsl(var(--muted-foreground))";
};

const num = (n: number) => n.toLocaleString("es-CO");

const KPIsOperativosSection = () => {
  const [loading, setLoading] = useState(true);
  const [filterOpts, setFilterOpts] = useState<FilterOptions>({
    anios: [], meses: [], semanas: [], transportadoras: [], proveedores: [], ciudades: [],
  });

  /* ── Filter state ── */
  const [fAnio, setFAnio] = useState("all");
  const [fMes, setFMes] = useState("all");
  const [fSemana, setFSemana] = useState("all");
  const [fTransp, setFTransp] = useState("all");
  const [fProv, setFProv] = useState("all");
  const [fCiudad, setFCiudad] = useState("all");
  const [searchOrder, setSearchOrder] = useState("");

  /* ── Data state ── */
  const [eventos, setEventos] = useState<any[]>([]);
  const [kpiSemanal, setKpiSemanal] = useState<any[]>([]);
  const [transportadoras, setTransportadoras] = useState<any[]>([]);
  const [riesgo, setRiesgo] = useState<any[]>([]);
  const [atribucion, setAtribucion] = useState<any[]>([]);

  /* ── 1. Load filter options (once) ── */
  useEffect(() => {
    const loadFilters = async () => {
      const { data } = await supabase
        .from("logistica_eventos")
        .select("orden_anio, orden_mes, orden_semana, transportadora, proveedor, ciudad_destino")
        .limit(10000);
      if (!data) return;
      setFilterOpts({
        anios: [...new Set(data.map(r => r.orden_anio).filter(v => v != null))].sort((a, b) => a - b) as number[],
        meses: [...new Set(data.map(r => r.orden_mes).filter(v => v != null))].sort((a, b) => a - b) as number[],
        semanas: [...new Set(data.map(r => r.orden_semana).filter(v => v != null))].sort((a, b) => a - b) as number[],
        transportadoras: [...new Set(data.map(r => r.transportadora).filter(v => v != null && v !== ""))].sort() as string[],
        proveedores: [...new Set(data.map(r => r.proveedor).filter(v => v != null && v !== ""))].sort() as string[],
        ciudades: [...new Set(data.map(r => r.ciudad_destino).filter(v => v != null && v !== ""))].sort() as string[],
      });
    };
    loadFilters();
  }, []);

  /* ── 2. applyAllFilters helper ── */
  const applyAllFilters = useCallback(
    (query: any, cols: { anio?: boolean; mes?: boolean; semana?: boolean; transportadora?: boolean; proveedor?: boolean; ciudad?: boolean }) => {
      if (cols.anio && fAnio !== "all") query = query.eq("orden_anio", Number(fAnio));
      if (cols.mes && fMes !== "all") query = query.eq("orden_mes", Number(fMes));
      if (cols.semana && fSemana !== "all") query = query.eq("orden_semana", Number(fSemana));
      if (cols.transportadora && fTransp !== "all") query = query.eq("transportadora", fTransp);
      if (cols.proveedor && fProv !== "all") query = query.eq("proveedor", fProv);
      if (cols.ciudad && fCiudad !== "all") query = query.eq("ciudad_destino", fCiudad);
      return query;
    },
    [fAnio, fMes, fSemana, fTransp, fProv, fCiudad],
  );

  /* ── 3. Load data when filters change ── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // logistica_eventos — all filter columns available
        let evQ = supabase
          .from("logistica_eventos")
          .select("order_id, fue_entregado, tuvo_retroceso, lead_time_acido_dias, lead_time_ajustado_dias, transportadora, proveedor, ciudad_destino");
        evQ = applyAllFilters(evQ, { anio: true, mes: true, semana: true, transportadora: true, proveedor: true, ciudad: true });
        const { data: evData } = await evQ;

        // v_kpi_semanal — has orden_anio, orden_mes, orden_semana
        let semQ = supabase.from("v_kpi_semanal").select("*");
        semQ = applyAllFilters(semQ, { anio: true, mes: true, semana: true });
        const { data: semData } = await semQ;

        // v_transportadoras — has transportadora
        let trQ = supabase.from("v_transportadoras").select("*");
        trQ = applyAllFilters(trQ, { transportadora: true });
        const { data: trData } = await trQ;

        // v_ordenes_riesgo — has transportadora, proveedor, ciudad_destino
        let riQ = supabase.from("v_ordenes_riesgo").select("*").order("dias_desde_creacion", { ascending: false });
        riQ = applyAllFilters(riQ, { transportadora: true, proveedor: true, ciudad: true });
        const { data: riData } = await riQ;

        // v_atribucion — no filterable columns
        const { data: atData } = await supabase.from("v_atribucion").select("*");

        setEventos(evData || []);
        setKpiSemanal(semData || []);
        setTransportadoras(trData || []);
        setRiesgo(riData || []);
        setAtribucion(atData || []);
      } catch (err) {
        console.error("Error loading KPIs Operativos:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fAnio, fMes, fSemana, fTransp, fProv, fCiudad, applyAllFilters]);

  /* ── KR1: Velocidad ── */
  const kr1 = useMemo(() => {
    const entregados = eventos.filter(e => Number(e.fue_entregado) === 1 && e.lead_time_acido_dias != null);
    const avg = entregados.length > 0 ? entregados.reduce((s, e) => s + Number(e.lead_time_acido_dias), 0) / entregados.length : 0;
    const entregadosAj = entregados.filter(e => e.lead_time_ajustado_dias != null);
    const avgAj = entregadosAj.length > 0 ? entregadosAj.reduce((s, e) => s + Number(e.lead_time_ajustado_dias), 0) / entregadosAj.length : 0;
    const color = avg <= 3.5 ? "text-success" : avg <= 5 ? "text-pending" : "text-destructive";
    const bg = avg <= 3.5 ? "bg-success/15" : avg <= 5 ? "bg-pending/15" : "bg-destructive/15";
    return { avg, avgAj, color, bg };
  }, [eventos]);

  /* ── KR2: Efectividad ── */
  const kr2 = useMemo(() => {
    const uniqueOrders = new Map<string, { entregado: boolean; retroceso: boolean }>();
    eventos.forEach(e => {
      const existing = uniqueOrders.get(e.order_id);
      const isEntregado = Number(e.fue_entregado) === 1;
      const hasRetroceso = Number(e.tuvo_retroceso) === 1;
      if (!existing) {
        uniqueOrders.set(e.order_id, { entregado: isEntregado, retroceso: hasRetroceso });
      } else {
        if (isEntregado) existing.entregado = true;
        if (hasRetroceso) existing.retroceso = true;
      }
    });
    const total = uniqueOrders.size;
    let sinRetroceso = 0;
    uniqueOrders.forEach(v => { if (v.entregado && !v.retroceso) sinRetroceso++; });
    const pct = total > 0 ? (sinRetroceso / total) * 100 : 0;
    const color = pct >= 92 ? "text-success" : pct >= 75 ? "text-pending" : "text-destructive";
    const bg = pct >= 92 ? "bg-success/15" : pct >= 75 ? "bg-pending/15" : "bg-destructive/15";
    return { pct, sinRetroceso, total, color, bg };
  }, [eventos]);

  /* ── Chart configs ── */
  const lineConfig = {
    avg_lead_acido: { label: "Lead Time Ácido", color: "hsl(var(--destructive))" },
    avg_lead_ajustado: { label: "Lead Time Ajustado", color: "hsl(var(--process))" },
  };
  const barConfig = {
    total_ordenes: { label: "Creadas", color: "hsl(var(--muted-foreground))" },
    entregadas: { label: "Entregadas", color: "hsl(var(--success))" },
  };

  /* ── Riesgo filtrado por búsqueda ── */
  const riesgoFiltrado = useMemo(() => {
    if (!searchOrder) return riesgo;
    return riesgo.filter(r => r.order_id?.toLowerCase().includes(searchOrder.toLowerCase()));
  }, [riesgo, searchOrder]);

  const tasaColor = (pct: number) => {
    if (pct < 70) return "text-destructive font-bold";
    if (pct < 85) return "text-pending font-bold";
    return "text-success font-bold";
  };

  const riesgoColor = (nivel: string) => {
    const n = nivel?.toLowerCase();
    if (n?.includes("crític") || n === "alto") return "bg-destructive/20 text-destructive";
    if (n?.includes("riesgo") || n === "medio") return "bg-pending/20 text-pending";
    return "bg-success/20 text-success";
  };

  const riesgoEmoji = (nivel: string) => {
    const n = nivel?.toLowerCase();
    if (n?.includes("crític") || n === "alto") return "🔴";
    if (n?.includes("riesgo") || n === "medio") return "🟡";
    return "🟢";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">Cargando KPIs Operativos…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── FILTROS GLOBALES ── */}
      <Card className="border-border bg-card">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filtros:</span>
          <Select value={fAnio} onValueChange={setFAnio}>
            <SelectTrigger className="w-[110px] bg-background"><SelectValue placeholder="Año" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {filterOpts.anios.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fMes} onValueChange={setFMes}>
            <SelectTrigger className="w-[110px] bg-background"><SelectValue placeholder="Mes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {filterOpts.meses.map(m => <SelectItem key={m} value={String(m)}>Mes {m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fSemana} onValueChange={setFSemana}>
            <SelectTrigger className="w-[120px] bg-background"><SelectValue placeholder="Semana" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {filterOpts.semanas.map(s => <SelectItem key={s} value={String(s)}>Sem {s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fTransp} onValueChange={setFTransp}>
            <SelectTrigger className="w-[160px] bg-background"><SelectValue placeholder="Transportadora" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {filterOpts.transportadoras.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fProv} onValueChange={setFProv}>
            <SelectTrigger className="w-[160px] bg-background"><SelectValue placeholder="Proveedor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {filterOpts.proveedores.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fCiudad} onValueChange={setFCiudad}>
            <SelectTrigger className="w-[160px] bg-background"><SelectValue placeholder="Ciudad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {filterOpts.ciudades.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* ── MÓDULO 1: KR Cards ── */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* KR1 Velocidad */}
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${kr1.bg}`}>
              <Zap className={`h-7 w-7 ${kr1.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">KR1 · Velocidad</p>
              <p className={`text-3xl font-bold ${kr1.color}`}>{kr1.avg.toFixed(1)} días</p>
              <p className="text-xs text-muted-foreground">Meta: 3.5 días · Ajustado (sin Marca): {kr1.avgAj.toFixed(1)} días</p>
            </div>
          </CardContent>
        </Card>

        {/* KR2 Efectividad */}
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${kr2.bg}`}>
              <Target className={`h-7 w-7 ${kr2.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">KR2 · Efectividad</p>
              <p className={`text-3xl font-bold ${kr2.color}`}>{kr2.pct.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Meta: 92% · {kr2.sinRetroceso} de {kr2.total} órdenes sin retroceso</p>
            </div>
          </CardContent>
        </Card>

        {/* KR3 Trazabilidad */}
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Eye className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">KR3 · Trazabilidad</p>
              <p className="text-2xl font-bold text-muted-foreground">En construcción 🚧</p>
              <p className="text-xs text-muted-foreground">% órdenes con tracking — próximamente</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── MÓDULO 2: Gráficas lado a lado ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lead Time semanal */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lead Time Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={lineConfig} className="aspect-[2/1] w-full">
              <LineChart data={kpiSemanal} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="orden_semana" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <ReferenceLine y={3.5} stroke="hsl(var(--pending))" strokeDasharray="6 3" label={{ value: "Meta 3.5", fill: "hsl(var(--pending))", fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="avg_lead_acido" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} name="Lead Ácido" />
                <Line type="monotone" dataKey="avg_lead_ajustado" stroke="hsl(var(--process))" strokeWidth={2} dot={{ r: 3 }} name="Lead Ajustado" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Órdenes creadas vs entregadas */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Órdenes Creadas vs Entregadas por Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barConfig} className="aspect-[2/1] w-full">
              <BarChart data={kpiSemanal} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="orden_semana" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total_ordenes" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Creadas" />
                <Bar dataKey="entregadas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Entregadas" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── MÓDULO 3: Semáforo transportadoras ── */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Semáforo Transportadoras</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transportadora</TableHead>
                <TableHead className="text-right">Órdenes</TableHead>
                <TableHead className="text-right">Entregadas</TableHead>
                <TableHead className="text-right">Tasa Éxito %</TableHead>
                <TableHead className="text-right">Lead Ácido</TableHead>
                <TableHead className="text-right">Retrocesos</TableHead>
                <TableHead>Semáforo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transportadoras.map((t) => (
                <TableRow key={t.transportadora}>
                  <TableCell className="font-medium">{t.transportadora}</TableCell>
                  <TableCell className="text-right">{num(Number(t.total_ordenes))}</TableCell>
                  <TableCell className="text-right">{num(Number(t.entregadas))}</TableCell>
                  <TableCell className={`text-right ${tasaColor(Number(t.tasa_exito_pct))}`}>
                    {Number(t.tasa_exito_pct).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">{Number(t.avg_lead_acido).toFixed(1)}</TableCell>
                  <TableCell className="text-right">{num(Number(t.total_retrocesos))}</TableCell>
                   <TableCell>
                     <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                       t.semaforo?.includes("🔴") ? "bg-destructive/20 text-destructive" :
                       t.semaforo?.includes("🟡") ? "bg-pending/20 text-pending" :
                       t.semaforo?.includes("✅") ? "bg-success/20 text-success" :
                       "bg-muted text-muted-foreground"
                     }`}>
                       {t.semaforo}
                     </span>
                   </TableCell>
                </TableRow>
              ))}
              {transportadoras.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Sin datos</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── MÓDULO 4: Órdenes en riesgo ── */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <CardTitle className="text-base">Órdenes en Riesgo</CardTitle>
          <Input
            placeholder="Buscar order_id…"
            value={searchOrder}
            onChange={e => setSearchOrder(e.target.value)}
            className="w-[220px] bg-background"
          />
        </CardHeader>
        <CardContent className="max-h-[460px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Transportadora</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead className="text-right">Días</TableHead>
                <TableHead>Último Tramo</TableHead>
                <TableHead>Alerta</TableHead>
                <TableHead>Riesgo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {riesgoFiltrado.slice(0, 100).map((r, i) => (
                <TableRow key={`${r.order_id}-${i}`}>
                  <TableCell className="font-mono text-xs">{r.order_id}</TableCell>
                  <TableCell>{r.transportadora}</TableCell>
                  <TableCell>{r.ciudad_destino}</TableCell>
                  <TableCell className="text-right font-bold">{Number(r.dias_desde_creacion).toFixed(0)}</TableCell>
                  <TableCell className="text-xs">{r.ultimo_tramo_alcanzado}</TableCell>
                  <TableCell className="text-xs">{r.alerta_logistica}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${riesgoColor(r.nivel_riesgo)}`}>
                      {riesgoEmoji(r.nivel_riesgo)} {r.nivel_riesgo}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {riesgoFiltrado.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Sin órdenes en riesgo</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── MÓDULO 5: Atribución días perdidos (Pie) ── */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">¿Quién le cuesta más tiempo al cliente?</CardTitle>
          <p className="text-xs text-muted-foreground">Atribución de días perdidos por responsable</p>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          {atribucion.length > 0 ? (
            <ChartContainer
              config={atribucion.reduce((acc, a) => {
                acc[a.responsable] = { label: a.responsable, color: getAtribColor(a.responsable) };
                return acc;
              }, {} as Record<string, { label: string; color: string }>)}
              className="aspect-square w-full max-w-[360px]"
            >
              <PieChart>
                <Pie
                  data={atribucion}
                  dataKey="dias_totales"
                  nameKey="responsable"
                  cx="50%"
                  cy="50%"
                  innerRadius="50%"
                  outerRadius="80%"
                  paddingAngle={3}
                  label={({ responsable, pct }) => `${responsable}: ${Number(pct).toFixed(0)}%`}
                  labelLine={false}
                >
                  {atribucion.map((a, i) => (
                    <Cell key={i} fill={getAtribColor(a.responsable)} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend formatter={(value) => <span className="text-xs text-foreground">{value}</span>} />
              </PieChart>
            </ChartContainer>
          ) : (
            <p className="py-12 text-sm text-muted-foreground">Sin datos de atribución</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KPIsOperativosSection;
