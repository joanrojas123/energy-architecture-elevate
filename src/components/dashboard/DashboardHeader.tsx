import { RefreshCw, TrendingUp, TrendingDown, Calendar, BarChart3, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface DashboardHeaderProps {
  meses: string[];
  selectedMes: string;
  onMesChange: (mes: string) => void;
  semCrecimiento: number;
  diaOrdenesHoy: number;
  diaRevenueHoy: number;
  onRefresh: () => void;
  hasData: boolean;
  loading: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const DashboardHeader = ({
  meses, selectedMes, onMesChange, semCrecimiento,
  diaOrdenesHoy, diaRevenueHoy, onRefresh, hasData, loading,
}: DashboardHeaderProps) => {
  return (
    <header className="border-b border-border bg-card px-6 py-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-process" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">E-Commerce BI Dashboard</h1>
            <p className="text-sm text-muted-foreground">Business Intelligence · Análisis de Ventas</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {hasData && (
            <>
              <Select value={selectedMes} onValueChange={onMesChange}>
                <SelectTrigger className="w-[160px] bg-background">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los meses</SelectItem>
                  {meses.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                {semCrecimiento >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-error" />
                )}
                <span className="font-medium">WoW</span>
                <span className={semCrecimiento >= 0 ? "font-semibold text-success" : "font-semibold text-error"}>
                  {semCrecimiento >= 0 ? "+" : ""}{semCrecimiento.toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <Calendar className="h-4 w-4 text-process" />
                <span className="font-medium">Hoy</span>
                <span className="font-semibold">{diaOrdenesHoy}</span>
                <span className="text-muted-foreground">órdenes</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <DollarSign className="h-4 w-4 text-success" />
                <span className="font-medium">Rev Hoy</span>
                <span className="font-semibold text-success">{fmt(diaRevenueHoy)}</span>
              </div>
            </>
          )}

          <Button
            onClick={onRefresh}
            disabled={loading}
            className="gap-2 bg-process text-process-foreground hover:bg-process/90"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Cargando…" : "🔄 Actualizar"}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
