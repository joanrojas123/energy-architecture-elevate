import { useMemo, useState, useEffect } from "react";
import { type SalesRow } from "@/lib/csv-processor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Target } from "lucide-react";

interface GoalsSectionProps {
  data: SalesRow[];       // ALL rows
  selectedMes: string;    // current selected period e.g. "2026-03"
}

const ESTADOS_EXCLUIDOS = ["cancelado", "rechazado"];
const normalize = (s: string) => (s || "").toString().trim().toLowerCase();

const formatCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function getPrevMonth(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 2, 1); // month is 0-indexed, so m-1 is current, m-2 is prev
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getActiveRows(rows: SalesRow[]) {
  return rows.filter((r) => !ESTADOS_EXCLUIDOS.includes(normalize(r.estado_actual)));
}

/* ── Gauge component using recharts PieChart ── */
const GaugeChart = ({ value, max, label, subtitle }: { value: number; max: number; label: string; subtitle: string }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 120) : 0;
  const clampedPct = Math.min(pct, 100);

  // Color based on percentage
  const getColor = (p: number) => {
    if (p >= 100) return "hsl(45, 93%, 47%)"; // gold
    if (p >= 85) return "hsl(var(--chart-green))";
    if (p >= 60) return "hsl(var(--pending))";
    return "hsl(var(--destructive))";
  };

  const color = getColor(pct);
  const gaugeData = [
    { value: clampedPct },
    { value: 100 - clampedPct },
  ];

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm">{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative h-[160px] w-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={gaugeData}
                cx="50%"
                cy="80%"
                startAngle={180}
                endAngle={0}
                innerRadius={80}
                outerRadius={110}
                dataKey="value"
                stroke="none"
              >
                <Cell fill={color} />
                <Cell fill="hsl(var(--muted))" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
            <span className={`text-2xl font-bold ${pct >= 100 ? "text-[hsl(45,93%,47%)]" : ""}`} style={pct < 100 ? { color } : undefined}>
              {pct.toFixed(1)}%
            </span>
          </div>
        </div>
        <p className="mt-1 text-center text-xs text-muted-foreground">{subtitle}</p>
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

const GoalsSection = ({ data, selectedMes }: GoalsSectionProps) => {
  const LS_KEY = "dashboard-goals-pct";
  const [growthPct, setGrowthPct] = useState(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? parseFloat(saved) : 20;
  });
  const [inputPct, setInputPct] = useState(String(growthPct));
  const [applied, setApplied] = useState(true);

  useEffect(() => {
    localStorage.setItem(LS_KEY, String(growthPct));
  }, [growthPct]);

  const handleApply = () => {
    const val = parseFloat(inputPct);
    if (!isNaN(val)) {
      setGrowthPct(val);
      setApplied(true);
    }
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

  // ── Sección 3: Proyección semanal ──
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

    return weeks.map((wk, i) => {
      const real = weekMap[wk];
      const realRev = real.revenue;
      const realOrd = real.orders.size;
      const diffRev = realRev - revPerWeek;
      const diffOrd = realOrd - ordPerWeek;
      // Cumulative progress
      const cumRev = weeks.slice(0, i + 1).reduce((s, w) => s + (weekMap[w]?.revenue || 0), 0);
      const pctAvance = metaRevenue > 0 ? (cumRev / metaRevenue) * 100 : 0;
      return {
        label: `Sem ${i + 1}`,
        wk,
        realRev, realOrd,
        needRev: revPerWeek, needOrd: ordPerWeek,
        diffRev, diffOrd, pctAvance,
      };
    });
  }, [currActive, metaRevenue, metaOrdenes]);

  // ── Sección 4: Metas por Marca ──
  const brandGoals = useMemo(() => {
    const prevMap: Record<string, number> = {};
    const currMap: Record<string, number> = {};
    for (const r of prevActive) {
      if (r.marca) prevMap[r.marca] = (prevMap[r.marca] || 0) + r.pvp_total * r.unidades;
    }
    for (const r of currActive) {
      if (r.marca) currMap[r.marca] = (currMap[r.marca] || 0) + r.pvp_total * r.unidades;
    }
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

  // ── Sección 5: Metas por Estrella ──
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

  const pctColor = (p: number) =>
    p >= 100 ? "text-[hsl(45,93%,47%)] font-bold" : p >= 85 ? "text-success" : p >= 60 ? "text-pending" : "text-destructive";

  return (
    <div className="space-y-6">
      {/* ── Sección 1: Configuración ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4" /> Configuración de Metas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">% de crecimiento vs mes anterior</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={inputPct}
                  onChange={(e) => { setInputPct(e.target.value); setApplied(false); }}
                  className="w-24"
                  placeholder="20"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <Button onClick={handleApply} size="sm">Aplicar metas</Button>
          </div>
          {applied && (
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
              <span className="font-medium text-foreground">
                Meta Revenue: {formatCOP(metaRevenue)} | Meta Órdenes: {metaOrdenes.toLocaleString()}
              </span>
              <span className="ml-2 text-muted-foreground">
                — basado en {prevMes} + {growthPct}%
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Sección 2: Velocímetros ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <GaugeChart
          value={currRevenue}
          max={metaRevenue}
          label="Revenue vs Meta"
          subtitle={`${formatCOP(currRevenue)} actual de ${formatCOP(metaRevenue)} meta`}
        />
        <GaugeChart
          value={currOrdenes}
          max={metaOrdenes}
          label="Órdenes vs Meta"
          subtitle={`${currOrdenes.toLocaleString()} actual de ${metaOrdenes.toLocaleString()} meta`}
        />
      </div>

      {/* ── Sección 3: Proyección semanal ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Proyección Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left font-medium text-muted-foreground">Semana</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Revenue Real</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Órdenes Real</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Rev. Necesario</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Órd. Necesarias</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Dif. Revenue</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">% Avance</th>
                </tr>
              </thead>
              <tbody>
                {weeklyData.map((w) => (
                  <tr key={w.wk} className="border-b border-border/50 last:border-0">
                    <td className="py-2 text-foreground">{w.label}</td>
                    <td className="py-2 text-right font-medium text-foreground">{formatCOP(w.realRev)}</td>
                    <td className="py-2 text-right font-medium text-foreground">{w.realOrd.toLocaleString()}</td>
                    <td className="py-2 text-right text-muted-foreground">{formatCOP(w.needRev)}</td>
                    <td className="py-2 text-right text-muted-foreground">{Math.ceil(w.needOrd).toLocaleString()}</td>
                    <td className={`py-2 text-right font-medium ${w.diffRev >= 0 ? "text-success" : "text-destructive"}`}>
                      {w.diffRev >= 0 ? "+" : ""}{formatCOP(w.diffRev)}
                    </td>
                    <td className={`py-2 text-right font-medium ${pctColor(w.pctAvance)}`}>
                      {w.pctAvance.toFixed(1)}%
                    </td>
                  </tr>
                ))}
                {weeklyData.length === 0 && (
                  <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">Sin datos semanales</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Sección 4: Metas por Marca ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Metas por Marca</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left font-medium text-muted-foreground">Marca</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Revenue Actual</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Meta Revenue</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Diferencia</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">% Cumpl.</th>
                  <th className="pb-2 text-left font-medium text-muted-foreground w-[120px]">Progreso</th>
                </tr>
              </thead>
              <tbody>
                {brandGoals.map((b) => (
                  <tr key={b.name} className="border-b border-border/50 last:border-0">
                    <td className="py-2 text-foreground max-w-[160px] truncate">{b.name}</td>
                    <td className="py-2 text-right font-medium text-foreground">{formatCOP(b.curr)}</td>
                    <td className="py-2 text-right text-muted-foreground">{formatCOP(b.meta)}</td>
                    <td className={`py-2 text-right font-medium ${b.diff >= 0 ? "text-success" : "text-destructive"}`}>
                      {b.diff >= 0 ? "+" : ""}{formatCOP(b.diff)}
                    </td>
                    <td className={`py-2 text-right font-medium ${pctColor(b.pct)}`}>
                      {b.pct.toFixed(1)}%
                    </td>
                    <td className="py-2 pl-2 w-[120px]">
                      <ColorProgress value={b.pct} />
                    </td>
                  </tr>
                ))}
                {brandGoals.length === 0 && (
                  <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">Sin datos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Sección 5: Metas por Estrella ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Metas por Estrella</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left font-medium text-muted-foreground">Estrella</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Órdenes Actual</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Meta Órdenes</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Diferencia</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">% Cumpl.</th>
                  <th className="pb-2 text-left font-medium text-muted-foreground w-[120px]">Progreso</th>
                </tr>
              </thead>
              <tbody>
                {starGoals.map((s) => (
                  <tr key={s.name} className="border-b border-border/50 last:border-0">
                    <td className="py-2 text-foreground max-w-[160px] truncate">{s.name}</td>
                    <td className="py-2 text-right font-medium text-foreground">{s.curr.toLocaleString()}</td>
                    <td className="py-2 text-right text-muted-foreground">{s.meta.toLocaleString()}</td>
                    <td className={`py-2 text-right font-medium ${s.diff >= 0 ? "text-success" : "text-destructive"}`}>
                      {s.diff >= 0 ? "+" : ""}{s.diff.toLocaleString()}
                    </td>
                    <td className={`py-2 text-right font-medium ${pctColor(s.pct)}`}>
                      {s.pct.toFixed(1)}%
                    </td>
                    <td className="py-2 pl-2 w-[120px]">
                      <ColorProgress value={s.pct} />
                    </td>
                  </tr>
                ))}
                {starGoals.length === 0 && (
                  <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">Sin datos</td></tr>
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
