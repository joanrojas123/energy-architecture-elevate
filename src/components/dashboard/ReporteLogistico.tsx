import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, ClipboardList, Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

const META_ACIDO_DIAS = 3.5;
const META_AJUSTADO_DIAS = 2.5;
const META_TASA_EXITO = 92;

interface LogisticaEventoRow {
  order_id: string;
  proveedor: string;
  orden_semana: number;
  orden_mes: number;
  orden_anio: number;
  orden_dia: number;
  lead_time_acido_dias: number;
  lead_time_ajustado_dias: number;
  fue_entregado: 0 | 1;
  status_exito: string;
  dias_marca_acum: number;
  dias_logistica_acum: number;
  dias_transp_acum: number;
  estado_actual: string;
  fecha_creacion: string;
}

interface WeeklyOrdersPoint {
  semana: string;
  creadas: number;
  entregadas: number;
}

interface WeeklyOwnerTimePoint {
  semana: string;
  marca: number;
  logistica: number;
  envio: number;
}

interface WeeklyLeadTimePoint {
  semana: string;
  acido: number;
  ajustado: number;
  metaAcido: number;
}

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-3 mt-2">
    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
      {title}
    </h3>
    <div className="h-px flex-1 bg-border" />
  </div>
);

const asString = (v: unknown): string => (v == null ? "" : String(v)).trim();
const asNumber = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const asInt = (v: unknown): number => {
  const n = Math.trunc(asNumber(v));
  return Number.isFinite(n) ? n : 0;
};

const asEntregado = (v: unknown): 0 | 1 => (asInt(v) === 1 ? 1 : 0);

const fmtNum = (n: number, digits = 1) =>
  n.toLocaleString("es-CO", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CO", { year: "numeric", month: "2-digit", day: "2-digit" });
};

const uniqueSortedNums = (rows: LogisticaEventoRow[], key: keyof LogisticaEventoRow) => {
  const set = new Set<number>();
  for (const r of rows) {
    const v = r[key];
    if (typeof v === "number" && Number.isFinite(v) && v !== 0) set.add(v);
  }
  return [...set].sort((a, b) => a - b);
};

async function fetchLogisticaEventos(): Promise<LogisticaEventoRow[]> {
  const pageSize = 1000;
  let from = 0;
  let done = false;
  const all: Record<string, unknown>[] = [];

  while (!done) {
    const { data, error } = await supabase
      .from("logistica_eventos")
      .select(
        [
          "order_id",
          "proveedor",
          "orden_semana",
          "orden_mes",
          "orden_anio",
          "orden_dia",
          "lead_time_acido_dias",
          "lead_time_ajustado_dias",
          "fue_entregado",
          "status_exito",
          "dias_marca_acum",
          "dias_logistica_acum",
          "dias_transp_acum",
          "estado_actual",
          "fecha_creacion",
        ].join(",")
      )
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      done = true;
      continue;
    }

    all.push(...(data as Record<string, unknown>[]));
    if (data.length < pageSize) done = true;
    from += pageSize;
  }

  return all.map((r) => ({
    order_id: asString(r.order_id),
    proveedor: asString(r.proveedor),
    orden_semana: asInt(r.orden_semana),
    orden_mes: asInt(r.orden_mes),
    orden_anio: asInt(r.orden_anio),
    orden_dia: asInt(r.orden_dia),
    lead_time_acido_dias: asNumber(r.lead_time_acido_dias),
    lead_time_ajustado_dias: asNumber(r.lead_time_ajustado_dias),
    fue_entregado: asEntregado(r.fue_entregado),
    status_exito: asString(r.status_exito),
    dias_marca_acum: asNumber(r.dias_marca_acum),
    dias_logistica_acum: asNumber(r.dias_logistica_acum),
    dias_transp_acum: asNumber(r.dias_transp_acum),
    estado_actual: asString(r.estado_actual),
    fecha_creacion: asString(r.fecha_creacion),
  }));
}

function dedupeByOrderLatest(rows: LogisticaEventoRow[]): LogisticaEventoRow[] {
  const map = new Map<string, LogisticaEventoRow>();
  for (const r of rows) {
    if (!r.order_id) continue;
    const existing = map.get(r.order_id);
    if (!existing) {
      map.set(r.order_id, r);
      continue;
    }
    const a = new Date(existing.fecha_creacion).getTime();
    const b = new Date(r.fecha_creacion).getTime();
    if (Number.isFinite(b) && (!Number.isFinite(a) || b > a)) map.set(r.order_id, r);
  }
  return [...map.values()];
}

const ReporteLogistico = () => {
  const [data, setData] = useState<LogisticaEventoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filtros (strings por Radix Select)
  const [anio, setAnio] = useState("all");
  const [mes, setMes] = useState("all");
  const [semana, setSemana] = useState("all");
  const [dia, setDia] = useState("all");

  // tabla
  const [page, setPage] = useState(0);
  const pageSize = 25;

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchLogisticaEventos();
        setData(rows);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Error al cargar el reporte logístico";
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const orderLevel = useMemo(() => dedupeByOrderLatest(data), [data]);

  const anios = useMemo(() => uniqueSortedNums(orderLevel, "orden_anio"), [orderLevel]);
  const meses = useMemo(() => uniqueSortedNums(orderLevel, "orden_mes"), [orderLevel]);
  const semanas = useMemo(() => uniqueSortedNums(orderLevel, "orden_semana"), [orderLevel]);
  const dias = useMemo(() => uniqueSortedNums(orderLevel, "orden_dia"), [orderLevel]);

  const filtered = useMemo(() => {
    let d = orderLevel;
    if (anio !== "all") d = d.filter((r) => String(r.orden_anio) === anio);
    if (mes !== "all") d = d.filter((r) => String(r.orden_mes) === mes);
    if (semana !== "all") d = d.filter((r) => String(r.orden_semana) === semana);
    if (dia !== "all") d = d.filter((r) => String(r.orden_dia) === dia);
    return d;
  }, [orderLevel, anio, mes, semana, dia]);

  useEffect(() => {
    setPage(0);
  }, [anio, mes, semana, dia]);

  const entregadas = useMemo(() => filtered.filter((r) => r.fue_entregado === 1), [filtered]);

  const kpis = useMemo(() => {
    const totalOrdenes = filtered.length;
    const entregadasUnicas = entregadas.length;

    const avg = (arr: number[]) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0);

    const acidos = entregadas.map((r) => r.lead_time_acido_dias).filter((n) => Number.isFinite(n) && n > 0);
    const ajustados = entregadas
      .map((r) => r.lead_time_ajustado_dias)
      .filter((n) => Number.isFinite(n) && n > 0);

    const leadTimeAcido = avg(acidos);
    const leadTimeAjustado = avg(ajustados);

    const exitosas = entregadas.filter((r) => r.status_exito.toLowerCase().includes("1er intento")).length;
    const tasaExito = entregadasUnicas > 0 ? (exitosas / entregadasUnicas) * 100 : 0;

    return {
      totalOrdenes,
      entregadasUnicas,
      leadTimeAcido,
      leadTimeAjustado,
      tasaExito,
    };
  }, [filtered, entregadas]);

  const weeklyOrders = useMemo<WeeklyOrdersPoint[]>(() => {
    const map = new Map<number, { creadas: number; entregadas: number }>();
    for (const r of filtered) {
      const w = r.orden_semana || 0;
      if (!map.has(w)) map.set(w, { creadas: 0, entregadas: 0 });
      const e = map.get(w)!;
      e.creadas += 1;
      if (r.fue_entregado === 1) e.entregadas += 1;
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([w, v]) => ({ semana: `S${w}`, creadas: v.creadas, entregadas: v.entregadas }));
  }, [filtered]);

  const weeklyOwner = useMemo<WeeklyOwnerTimePoint[]>(() => {
    const map = new Map<number, { m: number[]; l: number[]; t: number[] }>();
    for (const r of entregadas) {
      const w = r.orden_semana || 0;
      if (!map.has(w)) map.set(w, { m: [], l: [], t: [] });
      const e = map.get(w)!;
      e.m.push(r.dias_marca_acum);
      e.l.push(r.dias_logistica_acum);
      e.t.push(r.dias_transp_acum);
    }
    const avg = (arr: number[]) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0);
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([w, v]) => ({
        semana: `S${w}`,
        marca: avg(v.m),
        logistica: avg(v.l),
        envio: avg(v.t),
      }));
  }, [entregadas]);

  const weeklyLead = useMemo<WeeklyLeadTimePoint[]>(() => {
    const map = new Map<number, { a: number[]; b: number[] }>();
    for (const r of entregadas) {
      const w = r.orden_semana || 0;
      if (!map.has(w)) map.set(w, { a: [], b: [] });
      const e = map.get(w)!;
      if (Number.isFinite(r.lead_time_acido_dias) && r.lead_time_acido_dias > 0) e.a.push(r.lead_time_acido_dias);
      if (Number.isFinite(r.lead_time_ajustado_dias) && r.lead_time_ajustado_dias > 0) e.b.push(r.lead_time_ajustado_dias);
    }
    const avg = (arr: number[]) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0);
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([w, v]) => ({
        semana: `S${w}`,
        acido: avg(v.a),
        ajustado: avg(v.b),
        metaAcido: META_ACIDO_DIAS,
      }));
  }, [entregadas]);

  const detailRows = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      const ta = new Date(a.fecha_creacion).getTime();
      const tb = new Date(b.fecha_creacion).getTime();
      if (!Number.isFinite(ta) && !Number.isFinite(tb)) return 0;
      if (!Number.isFinite(ta)) return 1;
      if (!Number.isFinite(tb)) return -1;
      return tb - ta;
    });
    return sorted;
  }, [filtered]);

  const maxPage = Math.max(Math.ceil(detailRows.length / pageSize) - 1, 0);
  const pageRows = detailRows.slice(page * pageSize, page * pageSize + pageSize);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">Cargando reporte de OKRs Logística…</p>
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

  const kpiDefs = [
    {
      label: "TOTAL ÓRDENES",
      value: kpis.totalOrdenes.toLocaleString("es-CO"),
      icon: ClipboardList,
      color: "text-process",
      bg: "bg-process/10",
      sub: "Únicas (activas)",
      subColor: "text-muted-foreground",
    },
    {
      label: "ENTREGADAS",
      value: kpis.entregadasUnicas.toLocaleString("es-CO"),
      icon: CheckCircle,
      color: "text-success",
      bg: "bg-success/10",
      sub: `Tasa Éxito: ${fmtNum(kpis.tasaExito)}% (meta ${META_TASA_EXITO}%)`,
      subColor: kpis.tasaExito >= META_TASA_EXITO ? "text-success" : "text-error",
    },
    {
      label: "LEAD TIME ÁCIDO",
      value: `${fmtNum(kpis.leadTimeAcido)} días`,
      icon: ClipboardList,
      color: kpis.leadTimeAcido > META_ACIDO_DIAS ? "text-error" : "text-success",
      bg: kpis.leadTimeAcido > META_ACIDO_DIAS ? "bg-error/10" : "bg-success/10",
      sub: `Meta: ${META_ACIDO_DIAS} días`,
      subColor: "text-muted-foreground",
    },
    {
      label: "LEAD TIME AJUSTADO",
      value: `${fmtNum(kpis.leadTimeAjustado)} días`,
      icon: ClipboardList,
      color: kpis.leadTimeAjustado > META_AJUSTADO_DIAS ? "text-error" : "text-success",
      bg: kpis.leadTimeAjustado > META_AJUSTADO_DIAS ? "bg-error/10" : "bg-success/10",
      sub: `Meta: ${META_AJUSTADO_DIAS} días`,
      subColor: "text-muted-foreground",
    },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={anio} onValueChange={setAnio}>
          <SelectTrigger className="w-[130px] bg-background text-xs h-8">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {anios.map((v) => (
              <SelectItem key={v} value={String(v)}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="w-[130px] bg-background text-xs h-8">
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {meses.map((v) => (
              <SelectItem key={v} value={String(v)}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={semana} onValueChange={setSemana}>
          <SelectTrigger className="w-[130px] bg-background text-xs h-8">
            <SelectValue placeholder="Semana" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {semanas.map((v) => (
              <SelectItem key={v} value={String(v)}>
                {`S${v}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dia} onValueChange={setDia}>
          <SelectTrigger className="w-[130px] bg-background text-xs h-8">
            <SelectValue placeholder="Día" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {dias.map((v) => (
              <SelectItem key={v} value={String(v)}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <SectionHeader title="OKRs — Indicadores Clave" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {kpiDefs.map((c) => (
          <Card key={c.label} className="border border-border shadow-sm">
            <CardContent className="px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">
                    {c.label}
                  </p>
                  <p className="text-[22px] font-bold tracking-tight leading-tight mt-0.5">{c.value}</p>
                  <p className={`text-[10px] font-medium mt-0.5 ${c.subColor}`}>{c.sub}</p>
                </div>
                <div className={`rounded-md p-1.5 ${c.bg} shrink-0`}>
                  <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <SectionHeader title="Órdenes creadas vs entregadas por semana" />
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={weeklyOrders} margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="creadas" name="Creadas" fill="hsl(var(--process))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="entregadas" name="Entregadas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <SectionHeader title="Dueño del tiempo — Promedio por semana (días)" />
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={weeklyOwner} margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number, name: string) => [`${fmtNum(value)} días`, name]}
                  />
                  <Bar dataKey="marca" stackId="t" name="Marca" fill="#fc8181" />
                  <Bar dataKey="logistica" stackId="t" name="Logística" fill="#63b3ed" />
                  <Bar dataKey="envio" stackId="t" name="Envío" fill="#cbd5e0" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead time lines */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-4">
          <SectionHeader title="Lead Time por semana" />
          <div className="mt-3">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={weeklyLead} margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RTooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [`${fmtNum(value)} días`, name]}
                />
                <Line type="monotone" dataKey="acido" name="Ácido" stroke="#f56565" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ajustado" name="Ajustado" stroke="#4299e1" strokeWidth={2} dot={false} />
                <Line
                  type="monotone"
                  dataKey="metaAcido"
                  name="Meta Ácido"
                  stroke="#ed8936"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabla detalle */}
      <SectionHeader title="Detalle" />
      <Card className="border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] whitespace-nowrap">Fecha</TableHead>
                <TableHead className="text-[11px] whitespace-nowrap">Order ID</TableHead>
                <TableHead className="text-[11px] whitespace-nowrap">Proveedor</TableHead>
                <TableHead className="text-[11px] whitespace-nowrap">Estado</TableHead>
                <TableHead className="text-[11px] whitespace-nowrap">Lead Time Ácido</TableHead>
                <TableHead className="text-[11px] whitespace-nowrap">Alerta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => {
                const lt = r.lead_time_acido_dias;
                const ok = Number.isFinite(lt) && lt > 0 ? lt <= META_ACIDO_DIAS : true;
                return (
                  <TableRow key={r.order_id}>
                    <TableCell className="text-xs whitespace-nowrap">{fmtDate(r.fecha_creacion)}</TableCell>
                    <TableCell className="text-xs font-mono">{r.order_id}</TableCell>
                    <TableCell className="text-xs">{r.proveedor || "-"}</TableCell>
                    <TableCell className="text-xs">{r.estado_actual || "-"}</TableCell>
                    <TableCell className="text-xs">{Number.isFinite(lt) && lt > 0 ? `${fmtNum(lt)} d` : "-"}</TableCell>
                    <TableCell className="text-xs">
                      <Badge
                        variant={ok ? "secondary" : "destructive"}
                        className={ok ? "bg-success text-success-foreground" : ""}
                      >
                        {ok ? "≤ meta" : "> meta"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                    Sin filas para los filtros seleccionados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between gap-2 p-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Mostrando{" "}
            <span className="font-medium text-foreground">
              {detailRows.length === 0 ? 0 : page * pageSize + 1}–{Math.min((page + 1) * pageSize, detailRows.length)}
            </span>{" "}
            de <span className="font-medium text-foreground">{detailRows.length}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0}>
              Anterior
            </Button>
            <p className="text-xs text-muted-foreground">
              Página <span className="font-medium text-foreground">{page + 1}</span> de{" "}
              <span className="font-medium text-foreground">{maxPage + 1}</span>
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(p + 1, maxPage))}
              disabled={page >= maxPage}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ReporteLogistico;

