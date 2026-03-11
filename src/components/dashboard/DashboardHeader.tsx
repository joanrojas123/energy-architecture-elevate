import { RefreshCw, BarChart3, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface DashboardHeaderProps {
  meses: string[];
  selectedMes: string;
  onMesChange: (mes: string) => void;
  onRefresh: () => void;
  hasData: boolean;
  loading: boolean;
  lastUpdate?: string | null;
}

const DashboardHeader = ({
  meses, selectedMes, onMesChange, onRefresh, hasData, loading, lastUpdate,
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
          )}

          {lastUpdate && (
            <span className="text-xs text-muted-foreground">Última actualización: {lastUpdate}</span>
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
