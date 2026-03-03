import { DollarSign, ShoppingCart, TrendingUp, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardMetrics } from "@/lib/csv-processor";

interface KPICardsProps {
  metrics: DashboardMetrics;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const KPICards = ({ metrics }: KPICardsProps) => {
  const cards = [
    {
      label: "Revenue PVP",
      value: formatCurrency(metrics.totalRevenue),
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
      sub: `Tasa Éxito: ${metrics.tasaExito.toFixed(1)}%`,
    },
    {
      label: "Total Órdenes",
      value: metrics.totalOrdenes.toLocaleString("es-CO"),
      icon: ShoppingCart,
      color: "text-process",
      bgColor: "bg-process/10",
      sub: `Tránsito: ${metrics.enTransito} · Pendientes: ${metrics.pendientes}`,
    },
    {
      label: "AOV (Avg Order Value)",
      value: formatCurrency(metrics.aov),
      icon: TrendingUp,
      color: "text-pending",
      bgColor: "bg-pending/10",
      sub: "Valor promedio por orden activa",
    },
    {
      label: "UPO (Units Per Order)",
      value: metrics.upo.toFixed(2),
      icon: Package,
      color: "text-foreground",
      bgColor: "bg-muted",
      sub: `${metrics.totalUnidades.toLocaleString("es-CO")} unidades activas`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold tracking-tight">{card.value}</p>
              </div>
              <div className={`rounded-lg p-2.5 ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{card.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default KPICards;
