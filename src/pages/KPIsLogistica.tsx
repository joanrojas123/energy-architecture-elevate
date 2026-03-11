import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts";
import { Package, CheckCircle, Clock, Truck, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

/* ── Types ── */
interface EventoRow {
  order_id: string;
  estado_actual: string;
  lead_time_acido: number | null;
  lead_time_ajustado: number | null;
}

interface KpiSemanal {
  orden_semana: string;
  avg_lead_acido: number;
  avg_lead_ajustado: number;
}

interface Transportadora {
  transportadora: string;
  total_ordenes: number;
  entregadas: number;
  tasa_exito_pct: number;
  avg_lead_acido: number;
  semaforo: string;
}

interface Atribucion {
  responsable: string;
  dias_perdidos: number;
  pct: number;
}

interface OrdenRiesgo {
  order_id: string;
  transportadora: string;
  ciudad_destino: string;
  dias_desde_creacion: number;
  ultimo_tramo_alcanzado: string;
  alerta_logistica: string;
  nivel_riesgo: string;
}

/* ── Helpers ── */
const num = (n: number) => n.toLocaleString("es-CO");
const dec = (n: number) => n.toFixed(1);

const DONUT_COLORS = ["hsl(0 84% 60%)", "hsl(217 91% 60%)", "hsl(160 84% 39%)"];

const KPIsLogistica = () => {
  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState<EventoRow[]>([]);
  const [semanal, setSemanal] = useState<KpiSemanal[]>([]);
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [atribucion, setAtribucion] = useState<Atribucion[]>([]);
  const [riesgo, setRiesgo] = useState<OrdenRiesgo[]>([]);
  const [filtroTransp, setFiltroTransp] = useState("all");
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [evRes, semRes, trRes, atRes, riRes] = await Promise.all([
        supabase.from("logistica_eventos").select("order_id, estado_actual, lead_time_acido, lead_time_ajustado"),
        supabase.from("v_kpi_semanal").select("*"),
        supabase.from("v_transportadoras").select("*"),
        supabase.from("v_atribucion").select("*"),
        supabase.from("v_ordenes_riesgo").select("*").order("dias_desde_creacion", { ascending: false }),
      ]);
      if (evRes.data) setEventos(evRes.data);
      if (semRes.data) setSemanal(semRes.data);
      if (trRes.data) setTransportadoras(trRes.data);
      if (atRes.data) setAtribucion(atRes.data);
      if (riRes.data) setRiesgo(riRes.data);
      setLastUpdate(new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false }));
    } catch (err) {
      console.error("Error cargando KPIs logística:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  /* ── Computed KPIs ── */
  const totalOrdenes = eventos.length;
  const entregadas = eventos.filter(e => e.estado_actual?.toLowerCase() === "entregado").length;
  const validAcido = eventos.filter(e => e.lead_time_acido != null && !isNaN(Number(e.lead_time_acido)));
  const validAjustado = eventos.filter(e => e.lead_time_ajustado != null && !isNaN(Number(e.lead_time_ajustado)));
  const avgAcido = validAcido.length > 0 ? validAcido.reduce((s, e) => s + Number(e.lead_time_acido), 0) / validAcido.length : 0;
  const avgAjustado = validAjustado.length > 0 ? validAjustado.reduce((s, e) => s + Number(e.lead_time_ajustado), 0) / validAjustado.length : 0;

  /* ── Transportadoras únicas for filter ── */
  const transpUnicas = useMemo(() => [...new Set(riesgo.map(r => r.transportadora).filter(Boolean))].sort(), [riesgo]);
  const riesgoFiltrado = useMemo(() => {
    if (filtroTransp === "all") return riesgo;
    return riesgo.filter(r => r.transportadora === filtroTransp);
  }, [riesgo, filtroTransp]);

  /* ── Chart configs ── */
  const lineChartConfig = {
    avg_lead_acido: { label: "Lead Time Ácido", color: "hsl(0 84% 60%)" },
    avg_lead_ajustado: { label: "Lead Time Ajustado", color: "hsl(217 91% 60%)" },
  };

  const donutConfig = atribucion.reduce((acc, a, i) => {
    acc[a.responsable] = { label: a.responsable, color: DONUT_COLORS[i % DONUT_COLORS.length] };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  const kpiCards = [
    { label: "Total Órdenes", value: num(totalOrdenes), icon: Package, color: "text-process", bg: "bg-process/10" },
    { label: "Entregadas", value: num(entregadas), icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
    { label: "Lead Time Ácido (días)", value: dec(avgAcido), icon: Clock, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Lead Time Ajustado (días)", value: dec(avgAjustado), icon: Truck, color: "text-process", bg: "bg-process/10" },
  ];

  const tasaColor = (pct: number) => {
    if (pct < 70) return "text-destructive font-bold";
    if (pct < 85) return "text-pending font-bold";
    return "text-success font-bold";
  };

  const riesgoColor = (nivel: string) => {
    const n = nivel?.toLowerCase();
    if (n === "alto" || n === "crítico") return "bg-destructive/20 text-destructive";
    if (n === "medio") return "bg-pending/20 text-pending";
    return "bg-success/20 text-success";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Truck className="h-7 w-7 text-process" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">KPIs Logística</h1>
              <p className="text-sm text-muted-foreground">Análisis de rendimiento logístico</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdate && (
              <span className="text-xs text-muted-foreground">Última actualización: {lastUpdate}</span>
            )}
            <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] space-y-6 p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">Cargando KPIs logísticos…</p>
          </div>
        ) : (
          <>
            {/* 1. KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {kpiCards.map((k) => (
                <Card key={k.label} className="border-border bg-card">
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${k.bg}`}>
                      <k.icon className={`h-6 w-6 ${k.color}`} />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{k.label}</p>
                      <p className="text-2xl font-bold text-foreground">{k.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 2. Tendencia semanal */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tendencia Semanal — Lead Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={lineChartConfig} className="aspect-[3/1] w-full">
                  <LineChart data={semanal} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="orden_semana" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <ReferenceLine y={3.5} stroke="hsl(var(--pending))" strokeDasharray="6 3" label={{ value: "Meta 3.5", fill: "hsl(var(--pending))", fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="avg_lead_acido" stroke="hsl(0 84% 60%)" strokeWidth={2} dot={{ r: 3 }} name="Lead Ácido" />
                    <Line type="monotone" dataKey="avg_lead_ajustado" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={{ r: 3 }} name="Lead Ajustado" />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* 3. Semáforo transportadoras */}
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
                      <TableHead>Semáforo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transportadoras.map((t) => (
                      <TableRow key={t.transportadora}>
                        <TableCell className="font-medium">{t.transportadora}</TableCell>
                        <TableCell className="text-right">{num(t.total_ordenes)}</TableCell>
                        <TableCell className="text-right">{num(t.entregadas)}</TableCell>
                        <TableCell className={`text-right ${tasaColor(t.tasa_exito_pct)}`}>
                          {t.tasa_exito_pct.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right">{Number(t.avg_lead_acido).toFixed(1)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            t.semaforo === "verde" ? "bg-success/20 text-success" :
                            t.semaforo === "amarillo" ? "bg-pending/20 text-pending" :
                            "bg-destructive/20 text-destructive"
                          }`}>
                            <span className={`h-2 w-2 rounded-full ${
                              t.semaforo === "verde" ? "bg-success" :
                              t.semaforo === "amarillo" ? "bg-pending" : "bg-destructive"
                            }`} />
                            {t.semaforo}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {transportadoras.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin datos</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* 4. Atribución de días perdidos (donut) + 5. Órdenes en riesgo side by side on lg */}
            <div className="grid gap-6 lg:grid-cols-5">
              {/* Donut */}
              <Card className="border-border bg-card lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Atribución — Días Perdidos</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  {atribucion.length > 0 ? (
                    <ChartContainer config={donutConfig} className="aspect-square w-full max-w-[300px]">
                      <PieChart>
                        <Pie
                          data={atribucion}
                          dataKey="pct"
                          nameKey="responsable"
                          cx="50%"
                          cy="50%"
                          innerRadius="55%"
                          outerRadius="80%"
                          paddingAngle={3}
                          label={({ responsable, pct }) => `${pct.toFixed(0)}%`}
                          labelLine={false}
                        >
                          {atribucion.map((_, i) => (
                            <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend
                          formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                        />
                      </PieChart>
                    </ChartContainer>
                  ) : (
                    <p className="py-12 text-sm text-muted-foreground">Sin datos de atribución</p>
                  )}
                </CardContent>
              </Card>

              {/* Órdenes en riesgo */}
              <Card className="border-border bg-card lg:col-span-3">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Órdenes en Riesgo</CardTitle>
                  <Select value={filtroTransp} onValueChange={setFiltroTransp}>
                    <SelectTrigger className="w-[180px] bg-background">
                      <SelectValue placeholder="Transportadora" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {transpUnicas.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="max-h-[420px] overflow-auto">
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
                      {riesgoFiltrado.slice(0, 50).map((r) => (
                        <TableRow key={r.order_id}>
                          <TableCell className="font-mono text-xs">{r.order_id}</TableCell>
                          <TableCell>{r.transportadora}</TableCell>
                          <TableCell>{r.ciudad_destino}</TableCell>
                          <TableCell className="text-right font-bold">{r.dias_desde_creacion}</TableCell>
                          <TableCell className="text-xs">{r.ultimo_tramo_alcanzado}</TableCell>
                          <TableCell className="text-xs">{r.alerta_logistica}</TableCell>
                          <TableCell>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${riesgoColor(r.nivel_riesgo)}`}>
                              {r.nivel_riesgo}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {riesgoFiltrado.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin órdenes en riesgo</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default KPIsLogistica;
