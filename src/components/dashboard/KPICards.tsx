import {
  DollarSign, ShoppingCart, TrendingUp, TrendingDown, Package, CheckCircle, Truck,
  Clock, XCircle, Tag, Star, Percent, Calendar, BarChart3,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
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
  tooltip: string;
  subtitle?: string;
  subtitleColor?: string;
}

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-3">
    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{title}</h3>
    <div className="h-px flex-1 bg-border" />
  </div>
);

const KPICards = ({ metrics }: KPICardsProps) => {
  const now = new Date();
  const todayStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;

  const principales: CardDef[] = [
    { label: "REVENUE PVP", value: fmt(metrics.totalRevenue), icon: DollarSign, color: "text-success", bgColor: "bg-success/10", tooltip: "Suma de PVP × Unidades excluyendo cancelados/rechazados" },
    { label: "ÓRDENES", value: num(metrics.totalOrdenes), icon: ShoppingCart, color: "text-process", bgColor: "bg-process/10", tooltip: "Órdenes únicas activas (excluye canceladas/rechazadas)" },
    { label: "AOV", value: fmt(metrics.aov), icon: TrendingUp, color: "text-pending", bgColor: "bg-pending/10", tooltip: "Average Order Value: Revenue / Órdenes" },
    { label: "UPO", value: metrics.upo.toFixed(2), icon: Package, color: "text-process", bgColor: "bg-process/10", tooltip: "Units Per Order: Unidades / Órdenes" },
    { label: "TASA ÉXITO", value: `${metrics.tasaExito.toFixed(1)}%`, icon: Percent, color: "text-success", bgColor: "bg-success/10", tooltip: "% de órdenes entregadas sobre el total activo" },
  ];

  const salud: CardDef[] = [
    { label: "MARCAS ÚNICAS", value: num(metrics.marcasUnicas), icon: Tag, color: "text-process", bgColor: "bg-process/10", tooltip: "Cantidad de marcas distintas con órdenes activas" },
    { label: "ESTRELLAS ÚNICAS", value: num(metrics.estrellasUnicas), icon: Star, color: "text-pending", bgColor: "bg-pending/10", tooltip: "Cantidad de estrellas distintas con órdenes activas" },
  ];

  const pipeline: CardDef[] = [
    { label: "ENTREGADAS", value: num(metrics.totalEntregadas), icon: CheckCircle, color: "text-success", bgColor: "bg-success/10", tooltip: "Órdenes con estado 'entregado'" },
    { label: "EN TRÁNSITO", value: num(metrics.enTransito), icon: Truck, color: "text-process", bgColor: "bg-process/10", tooltip: "Órdenes despachadas, en bodega, en reparto, etc." },
    { label: "PENDIENTES", value: num(metrics.pendientes), icon: Clock, color: "text-pending", bgColor: "bg-pending/10", tooltip: "Órdenes pendientes o con guía generada" },
    { label: "CANCELADAS / RECHAZADAS", value: num(metrics.canceladasRechazadas), icon: XCircle, color: "text-error", bgColor: "bg-error/10", tooltip: "Órdenes canceladas o rechazadas" },
  ];

  const hoy: CardDef[] = [
    { label: "ÓRDENES HOY", value: num(metrics.diaOrdenesHoy), icon: Calendar, color: "text-process", bgColor: "bg-process/10", tooltip: `Órdenes creadas hoy (${todayStr})` },
    { label: "REVENUE HOY", value: fmt(metrics.diaRevenueHoy), icon: DollarSign, color: "text-success", bgColor: "bg-success/10", tooltip: `Revenue de órdenes creadas hoy (${todayStr})` },
  ];

  const ordCrecStr = metrics.semOrdenesCrecimiento >= 0
    ? `+${metrics.semOrdenesCrecimiento.toFixed(1)}%` : `${metrics.semOrdenesCrecimiento.toFixed(1)}%`;
  const revCrecStr = metrics.semRevenueCrecimiento >= 0
    ? `+${metrics.semRevenueCrecimiento.toFixed(1)}%` : `${metrics.semRevenueCrecimiento.toFixed(1)}%`;

  const wow: CardDef[] = [
    {
      label: "ÓRD. SEM. ACTUAL",
      value: num(metrics.semOrdenesActual),
      icon: metrics.semOrdenesCrecimiento >= 0 ? TrendingUp : TrendingDown,
      color: metrics.semOrdenesCrecimiento >= 0 ? "text-success" : "text-error",
      bgColor: metrics.semOrdenesCrecimiento >= 0 ? "bg-success/10" : "bg-error/10",
      tooltip: "Órdenes de la semana actual vs semana anterior",
      subtitle: `vs ${num(metrics.semOrdenesAnterior)} (${ordCrecStr})`,
      subtitleColor: metrics.semOrdenesCrecimiento >= 0 ? "text-success" : "text-error",
    },
    {
      label: "REV. SEM. ACTUAL",
      value: fmt(metrics.semRevenueActual),
      icon: metrics.semRevenueCrecimiento >= 0 ? TrendingUp : TrendingDown,
      color: metrics.semRevenueCrecimiento >= 0 ? "text-success" : "text-error",
      bgColor: metrics.semRevenueCrecimiento >= 0 ? "bg-success/10" : "bg-error/10",
      tooltip: "Revenue de la semana actual vs semana anterior",
      subtitle: `vs ${fmt(metrics.semRevenueAnterior)} (${revCrecStr})`,
      subtitleColor: metrics.semRevenueCrecimiento >= 0 ? "text-success" : "text-error",
    },
  ];

  const renderCard = (card: CardDef) => (
    <TooltipProvider key={card.label} delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="border border-border shadow-sm cursor-default">
            <CardContent className="px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">{card.label}</p>
                  <p className="text-[22px] font-bold tracking-tight leading-tight mt-0.5">{card.value}</p>
                  {card.subtitle && (
                    <p className={`text-[10px] font-medium mt-0.5 ${card.subtitleColor || "text-muted-foreground"}`}>
                      {card.subtitle}
                    </p>
                  )}
                </div>
                <div className={`rounded-md p-1.5 ${card.bgColor} shrink-0`}>
                  <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-[200px]">
          {card.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="space-y-4">
      {/* PRINCIPALES — 5 in a row */}
      <SectionHeader title="Principales" />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
        {principales.map(renderCard)}
      </div>

      {/* SALUD DEL NEGOCIO — 2 compact */}
      <SectionHeader title="Salud del Negocio" />
      <div className="grid grid-cols-2 gap-2">
        {salud.map(renderCard)}
      </div>

      {/* PIPELINE LOGÍSTICO — 4 with semaphore colors */}
      <SectionHeader title="Pipeline Logístico" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {pipeline.map(renderCard)}
      </div>

      {/* HOY */}
      <SectionHeader title={`Hoy — ${todayStr}`} />
      <div className="grid grid-cols-2 gap-2">
        {hoy.map(renderCard)}
      </div>

      {/* WoW */}
      <SectionHeader title="WoW — Semana vs Semana" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {wow.map(renderCard)}
      </div>
    </div>
  );
};

export default KPICards;
