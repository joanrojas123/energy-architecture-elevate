import { useMemo, useState, useEffect } from "react";
import { type SalesRow } from "@/lib/csv-processor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Target } from "lucide-react";

interface GoalsSectionProps {
  data: SalesRow[];
  selectedMes: string;
}

const ESTADOS_EXCLUIDOS = ["cancelado", "rechazado"];
const normalize = (s: string) => (s || "").toString().trim().toLowerCase();

const formatCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function getPrevMonth(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getActiveRows(rows: SalesRow[]) {
  return rows.filter((r) => !ESTADOS_EXCLUIDOS.includes(normalize(r.estado_actual)));
}

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-3">
    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{title}</h3>
    <div className="h-px flex-1 bg-border" />
  </div>
);

const StatusBadge = ({ pct }: { pct: number }) => {
  if (pct >= 85) return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-success/15 text-success">🟢 En meta</span>;
  if (pct >= 60) return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-pending/15 text-pending">🟡 En riesgo</span>;
  return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-destructive/15 text-destructive">🔴 Rezagada</span>;
};

/* ── Gauge ── */
const GaugeChart = ({ value, max, label, subtitle }: { value: number; max: number; label: string; subtitle: string }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 120) : 0;
  const clampedPct = Math.min(pct, 100);
  const getColor = (p: number) => {
    if (p >= 100) return "hsl(45, 93%, 47%)";
    if (p >= 85) return "hsl(var(--chart-green))";
    if (p >= 60) return "hsl(var(--pending))";
    return "hsl(var(--destructive))";
  };
  const color = getColor(pct);
  const gaugeData = [{ value: clampedPct }, { value: 100 - clampedPct }];
  const diff = max - value;

  return (
    <Card>
      <CardHeader className="px-3 py-2">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center px-3 pb-3">
        <div className="relative" style={{ height: 250, width: "100%", maxWidth: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={gaugeData}
                cx="50%"
                cy="75%"
                startAngle={180}
                endAngle={0}
                innerRadius="60%"
                outerRadius="90%"
                dataKey="value"
                stroke="none"
              >
                <Cell fill={color} />
                <Cell fill="hsl(var(--muted))" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-8">
            <span className="text-3xl font-bold" style={{ color }}>{pct.toFixed(1)}%</span>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">{subtitle}</p>
        <p className="mt-1 text-center text-xs font-medium">
          {pct >= 100 ? (
            <span className="text-[hsl(45,93%,47%)]">🎉 ¡Meta cumplida!</span>
          ) : (
            <span className="text-muted-foreground">
              Faltan {label.includes("Revenue") ? formatCOP(Math.max(0, diff)) : Math.max(0, Math.ceil(diff)).toLocaleString()} para la meta
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );
};

/* ── Progress bar with color ── */
const ColorProgress = ({ value }: { value: number }) => {
  const clamped = Math.min(value, 100);
  const colorClass = value >= 100 ? "[&>div]:bg-[hsl(45,93%,47%)]" : value >= 85 ? "[&>div]:bg-success" : value >= 60 ? "[&>div]:bg-pending" : "[&>div]:bg-destructive";
  return <Progress value={clamped} className={`h-2 ${colorClass}`} />;
};

const pctColor = (p: number) =>
  p >= 100 ? "text-[hsl(45,93%,47%)] font-bold" : p >= 85 ? "text-success" : p >= 60 ? "text-pending" : "text-destructive";

const GoalsSection = ({ data, selectedMes }: GoalsSectionProps) => {
  const LS_KEY = "dashboard-goals-pct";
  const [growthPct, setGrowthPct] = useState(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? parseFloat(saved) : 20;
  });
  const [inputPct, setInputPct] = useState(String(growthPct));
  const [applied, setApplied] = useState(true);

  useEffect(() => { localStorage.setItem(LS_KEY, String(growthPct)); }, [growthPct]);

  const handleApply = () => {
    const val = parseFloat(inputPct);
    if (!isNaN(val)) { setGrowthPct(val); setApplied(true); }
  };

  const prevMes = useMemo(() => getPrevMonth(selectedMes), [selectedMes]);
  const prevActive = useMemo(() => getActiveRows(data.filter((r) => r.mes_id === prevMes)), [data, prevMes]);
  const currActive = useMemo(() => getActiveRows(data.filter((r) => r.mes_id === selectedMes)), [data, selectedMes]);

  const prevRevenue = useMemo(() => prevActive.reduce((s, r) => s + r.pvp_total * r.unidades, 0), [prevActive]);
  const prevOrdenes = useMemo(() => new Set(prevActive.map((r) => r.order_id)).size, [prevActive]);
  const currRevenue = useMemo(() => currActive.reduce((s, r) => s + r.pvp_total * r.unidades, 0), [currActive]);
  const currOrdenes = useMemo(() => new Set(currActive.map((r) => r.order_id)).size, [currActive]);

  const metaRevenue = prevRevenue * (1 + growthPct / 100);
  const metaOrdenes = Math.ceil(prevOrdenes * (1 + growthPct / 100));

  // Weekly projection
  const weeklyData = useMemo(() => {
    const weekMap: Record<number, { orders: Set<string>; revenue: number }> = {};
    for (const r of currActive) {
      const wk = r.semana_del_anio;
      if (!wk) continue;
      if (!weekMap[wk]) weekMap[wk] = { orders: new Set(), revenue: 0 };
      weekMap[wk].orders.add(r.order_id);
      weekMap[wk].revenue += r.pvp_total * r.unidades;
    }
    const weeks = Object.keys(weekMap).map(Number).sort((a, b) => a - b);
    const totalWeeks = Math.max(weeks.length, 4);
    const revPerWeek = metaRevenue / totalWeeks;
    const ordPerWeek = metaOrdenes / totalWeeks;

    // Cumulative for projection
    let cumRev = 0;
    let cumOrd = 0;

    return weeks.map((wk, i) => {
      const real = weekMap[wk];
      const realRev = real.revenue;
      const realOrd = real.orders.size;
      cumRev += realRev;
      cumOrd += realOrd;
      const diffRev = realRev - revPerWeek;
      const diffOrd = realOrd - ordPerWeek;
      const pctAvance = metaRevenue > 0 ? (cumRev / metaRevenue) * 100 : 0;

      // Projection: at current weekly avg, what will month close at?
      const weeksSoFar = i + 1;
      const avgRevPerWeek = cumRev / weeksSoFar;
      const avgOrdPerWeek = cumOrd / weeksSoFar;
      const projectedRev = avgRevPerWeek * totalWeeks;
      const projectedOrd = Math.ceil(avgOrdPerWeek * totalWeeks);

      return {
        label: `Sem ${i + 1}`, wk,
        realRev, realOrd,
        needRev: revPerWeek, needOrd: ordPerWeek,
        diffRev, diffOrd, pctAvance,
        projectedRev, projectedOrd,
      };
    });
  }, [currActive, metaRevenue, metaOrdenes]);

  // Brand goals
  const brandGoals = useMemo(() => {
    const prevMap: Record<string, number> = {};
    const currMap: Record<string, number> = {};
    for (const r of prevActive) { if (r.marca) prevMap[r.marca] = (prevMap[r.marca] || 0) + r.pvp_total * r.unidades; }
    for (const r of currActive) { if (r.marca) currMap[r.marca] = (currMap[r.marca] || 0) + r.pvp_total * r.unidades; }
    const allBrands = new Set([...Object.keys(prevMap), ...Object.keys(currMap)]);
    return [...allBrands]
      .map((name) => {
        const prev = prevMap[name] || 0;
        const curr = currMap[name] || 0;
        const meta = prev * (1 + growthPct / 100);
        const diff = curr - meta;
        const pct = meta > 0 ? (curr / meta) * 100 : curr > 0 ? 100 : 0;
        return { name, curr, meta, diff, pct };
      })
      .filter((b) => b.meta > 0 || b.curr > 0)
      .sort((a, b) => a.pct - b.pct);
  }, [prevActive, currActive, growthPct]);

  // Star goals
  const starGoals = useMemo(() => {
    const prevMap: Record<string, Set<string>> = {};
    const currMap: Record<string, Set<string>> = {};
    for (const r of prevActive) {
      if (r.estrella_nombre) {
        if (!prevMap[r.estrella_nombre]) prevMap[r.estrella_nombre] = new Set();
        prevMap[r.estrella_nombre].add(r.order_id);
      }
    }
    for (const r of currActive) {
      if (r.estrella_nombre) {
        if (!currMap[r.estrella_nombre]) currMap[r.estrella_nombre] = new Set();
        currMap[r.estrella_nombre].add(r.order_id);
      }
    }
    const allStars = new Set([...Object.keys(prevMap), ...Object.keys(currMap)]);
    return [...allStars]
      .map((name) => {
        const prev = prevMap[name]?.size || 0;
        const curr = currMap[name]?.size || 0;
        const meta = Math.ceil(prev * (1 + growthPct / 100));
        const diff = curr - meta;
        const pct = meta > 0 ? (curr / meta) * 100 : curr > 0 ? 100 : 0;
        return { name, curr, meta, diff, pct };
      })
      .filter((s) => s.meta > 0 || s.curr > 0)
      .sort((a, b) => a.pct - b.pct);
  }, [prevActive, currActive, growthPct]);

  return (
    <div className="space-y-4">
      {/* Config */}
      <SectionHeader title="Configuración de Metas" />
      <Card>
        <CardContent className="px-3 py-3 space-y-2">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider font-medium text-muted-foreground">% crecimiento vs mes anterior</label>
              <div className="flex items-center gap-2">
                <Input type="number" value={inputPct} onChange={(e) => { setInputPct(e.target.value); setApplied(false); }} className="w-20 h-8 text-sm" placeholder="20" />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <Button onClick={handleApply} size="sm" className="h-8 text-xs">Aplicar</Button>
          </div>
          {applied && (
            <div className="rounded border border-border bg-muted/50 px-3 py-2 text-xs">
              <span className="font-semibold">Meta Revenue: {formatCOP(metaRevenue)} | Meta Órdenes: {metaOrdenes.toLocaleString()}</span>
              <span className="ml-2 text-muted-foreground">— basado en {prevMes} + {growthPct}%</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gauges */}
      <SectionHeader title="Velocímetros" />
      <div className="grid gap-3 md:grid-cols-2">
        <GaugeChart value={currRevenue} max={metaRevenue} label="Revenue vs Meta" subtitle={`${formatCOP(currRevenue)} de ${formatCOP(metaRevenue)} meta`} />
        <GaugeChart value={currOrdenes} max={metaOrdenes} label="Órdenes vs Meta" subtitle={`${currOrdenes.toLocaleString()} de ${metaOrdenes.toLocaleString()} meta`} />
      </div>

      {/* Weekly Projection */}
      <SectionHeader title="Proyección Semanal" />
      <Card>
        <CardContent className="px-3 py-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-1.5 text-left font-medium text-muted-foreground">Semana</th>
                  <th className="pb-1.5 text-right font-medium text-muted-foreground">Rev. Real</th>
                  <th className="pb-1.5 text-right font-medium text-muted-foreground">Órd. Real</th>
                  <th className="pb-1.5 text-right font-medium text-muted-foreground">Rev. Necesario</th>
                  <th className="pb-1.5 text-right font-medium text-muted-foreground">Órd. Nec.</th>
                  <th className="pb-1.5 text-right font-medium text-muted-foreground">Dif. Rev.</th>
                  <th className="pb-1.5 text-right font-medium text-muted-foreground">% Avance</th>
                  <th className="pb-1.5 text-right font-medium text-muted-foreground">Proy. Cierre</th>
                </tr>
              </thead>
              <tbody>
                {weeklyData.map((w) => {
                  const projMeetsMeta = w.projectedRev >= metaRevenue;
                  return (
                    <tr key={w.wk} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 text-foreground font-medium">{w.label}</td>
                      <td className="py-1.5 text-right font-medium text-foreground">{formatCOP(w.realRev)}</td>
                      <td className="py-1.5 text-right font-medium text-foreground">{w.realOrd.toLocaleString()}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{formatCOP(w.needRev)}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{Math.ceil(w.needOrd).toLocaleString()}</td>
                      <td className={`py-1.5 text-right font-medium ${w.diffRev >= 0 ? "text-success" : "text-destructive"}`}>
                        {w.diffRev >= 0 ? "+" : ""}{formatCOP(w.diffRev)}
                      </td>
                      <td className={`py-1.5 text-right font-medium ${pctColor(w.pctAvance)}`}>{w.pctAvance.toFixed(1)}%</td>
                      <td className={`py-1.5 text-right font-medium ${projMeetsMeta ? "text-success" : "text-destructive"}`}>
                        {formatCOP(w.projectedRev)}
                      </td>
                    </tr>
                  );
                })}
                {weeklyData.length === 0 && (
                  <tr><td colSpan={8} className="py-3 text-center text-muted-foreground">Sin datos semanales</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Brand Goals */}
      <SectionHeader title="Metas por Marca" />
      <Card>
        <CardContent className="px-3 py-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-1.5 text-left font-medium text-muted-foreground">Marca</th>
                  <th className="pb-1.5 text-right font-medium text-muted-foreground">Rev. Actual</th>
                  <th className="pb-1.5 text-right font-medium text-muted-foreground">Meta Rev.</th>
                  <th className="pb-1.5 text-right font-medium text-muted-foreground">Diferencia</th>
                  <th className="pb-1.5 text-right font-medium text-muted-foreground">% Cumpl.</th>
                  <th className="pb-1.5 text-center font-medium text-muted-foreground">Estado</th>
                  <th className="pb-1.5 text-left font-medium text-muted-foreground w-[100px]">Progreso</th>
                </tr>
              </thead>
              <tbody>
                {brandGoals.map((b) => (
                  <tr key={b.name} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 text-foreground max-w-[150px] truncate">{b.name}</td>
                    <td className="py-1.5 text-right font-medium text-foreground">{formatCOP(b.curr)}</td>
                    <td className="py-1.5 text-right text-muted-foreground">{formatCOP(b.meta)}</td>
                    <td className={`py-1.5 text-right font-medium ${b.diff >= 0 ? "text-success" : "text-destructive"}`}>
                      {b.diff >= 0 ? "+" : ""}{formatCOP(b.diff)}
                    </td>
                    <td className={`py-1.5 text-right font-medium ${pctColor(b.pct)}`}>{b.pct.toFixed(1)}%</td>
                    <td className="py-1.5 text-center"><StatusBadge pct={b.pct} /></td>
                    <td className="py-1.5 pl-2 w-[100px]"><ColorProgress value={b.pct} /></td>
                  </tr>
                ))}
                {brandGoals.length === 0 && (
                  <tr><td colSpan={7} className="py-3 text-center text-muted-foreground">Sin datos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Star Goals */}
      <SectionHeader title="Metas por Estrella" />
      <Card>
        <CardContent className="px-3 py-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-1.5 text-left font-medium text-muted-foreground">Estrella</th>
                  <th className="pb-1.5 text-right font-medium text-muted-foreground">Órd. Actual</th>
                  <th className="pb-1.5 text-right font-medium text-muted-foreground">Meta Órd.</th>
                  <th className="pb-1.5 text-right font-medium text-muted-foreground">Diferencia</th>
                  <th className="pb-1.5 text-right font-medium text-muted-foreground">% Cumpl.</th>
                  <th className="pb-1.5 text-center font-medium text-muted-foreground">Estado</th>
                  <th className="pb-1.5 text-left font-medium text-muted-foreground w-[100px]">Progreso</th>
                </tr>
              </thead>
              <tbody>
                {starGoals.map((s) => (
                  <tr key={s.name} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 text-foreground max-w-[150px] truncate">{s.name}</td>
                    <td className="py-1.5 text-right font-medium text-foreground">{s.curr.toLocaleString()}</td>
                    <td className="py-1.5 text-right text-muted-foreground">{s.meta.toLocaleString()}</td>
                    <td className={`py-1.5 text-right font-medium ${s.diff >= 0 ? "text-success" : "text-destructive"}`}>
                      {s.diff >= 0 ? "+" : ""}{s.diff.toLocaleString()}
                    </td>
                    <td className={`py-1.5 text-right font-medium ${pctColor(s.pct)}`}>{s.pct.toFixed(1)}%</td>
                    <td className="py-1.5 text-center"><StatusBadge pct={s.pct} /></td>
                    <td className="py-1.5 pl-2 w-[100px]"><ColorProgress value={s.pct} /></td>
                  </tr>
                ))}
                {starGoals.length === 0 && (
                  <tr><td colSpan={7} className="py-3 text-center text-muted-foreground">Sin datos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoalsSection;
