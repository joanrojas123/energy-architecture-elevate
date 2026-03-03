import {
  DollarSign, ShoppingCart, TrendingUp, Package, CheckCircle, Truck,
  Clock, XCircle, Tag, Star, Percent,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardMetrics } from "@/lib/csv-processor";

interface KPICardsProps {
  metrics: DashboardMetrics;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const num = (n: number) => n.toLocaleString("es-CO");

interface CardDef {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const KPICards = ({ metrics }: KPICardsProps) => {
  const principales: CardDef[] = [
    { label: "Revenue PVP", value: fmt(metrics.totalRevenue), icon: DollarSign, color: "text-success", bgColor: "bg-success/10" },
    { label: "Total Órdenes", value: num(metrics.totalOrdenes), icon: ShoppingCart, color: "text-process", bgColor: "bg-process/10" },
    { label: "Total Unidades", value: num(metrics.totalUnidades), icon: Package, color: "text-foreground", bgColor: "bg-muted" },
    { label: "AOV", value: fmt(metrics.aov), icon: TrendingUp, color: "text-pending", bgColor: "bg-pending/10" },
    { label: "UPO", value: metrics.upo.toFixed(2), icon: Package, color: "text-process", bgColor: "bg-process/10" },
  ];

  const salud: CardDef[] = [
    { label: "Marcas Únicas", value: num(metrics.marcasUnicas), icon: Tag, color: "text-process", bgColor: "bg-process/10" },
    { label: "Estrellas Únicas", value: num(metrics.estrellasUnicas), icon: Star, color: "text-pending", bgColor: "bg-pending/10" },
    { label: "Tasa de Éxito", value: `${metrics.tasaExito.toFixed(1)}%`, icon: Percent, color: "text-success", bgColor: "bg-success/10" },
  ];

  const pipeline: CardDef[] = [
    { label: "Entregadas", value: num(metrics.totalEntregadas), icon: CheckCircle, color: "text-success", bgColor: "bg-success/10" },
    { label: "En Tránsito", value: num(metrics.enTransito), icon: Truck, color: "text-process", bgColor: "bg-process/10" },
    { label: "Pendientes", value: num(metrics.pendientes), icon: Clock, color: "text-pending", bgColor: "bg-pending/10" },
    { label: "Canceladas / Rechazadas", value: num(metrics.canceladasRechazadas), icon: XCircle, color: "text-error", bgColor: "bg-error/10" },
  ];

  const renderRow = (title: string, cards: CardDef[]) => (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className={`grid gap-3 ${cards.length === 5 ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5" : cards.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
        {cards.map((card) => (
          <Card key={card.label} className="border border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{card.label}</p>
                  <p className="text-xl font-bold tracking-tight">{card.value}</p>
                </div>
                <div className={`rounded-lg p-2 ${card.bgColor}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {renderRow("Principales", principales)}
      {renderRow("Salud del Negocio", salud)}
      {renderRow("Pipeline Logístico", pipeline)}
    </div>
  );
};

export default KPICards;
