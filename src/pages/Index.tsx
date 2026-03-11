import { useState, useCallback, useMemo, useEffect } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import KPICards from "@/components/dashboard/KPICards";
import DataTable from "@/components/dashboard/DataTable";
import AnalyticsSection from "@/components/dashboard/AnalyticsSection";
import TrendsSection from "@/components/dashboard/TrendsSection";
import GoalsSection from "@/components/dashboard/GoalsSection";
import LogisticaAvanzadaSection from "@/components/dashboard/LogisticaAvanzadaSection";
import KPIsOperativosSection from "@/components/dashboard/KPIsOperativosSection";
import PanoramaSection from "@/components/dashboard/PanoramaSection";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  fetchVentas,
  calculateMetrics,
  getUniqueMeses,
  type SalesRow,
  type DashboardMetrics,
} from "@/lib/csv-processor";
import { FileSpreadsheet, Loader2 } from "lucide-react";

const EMPTY_METRICS: DashboardMetrics = {
  totalOrdenes: 0, totalUnidades: 0, totalRevenue: 0, tasaExito: 0,
  aov: 0, upo: 0, enTransito: 0, pendientes: 0, totalEntregadas: 0,
  canceladasRechazadas: 0, marcasUnicas: 0, estrellasUnicas: 0,
  diaOrdenesHoy: 0, diaRevenueHoy: 0,
  semOrdenesActual: 0, semOrdenesAnterior: 0, semOrdenesCrecimiento: 0,
  semRevenueActual: 0, semRevenueAnterior: 0, semRevenueCrecimiento: 0,
};

const Index = () => {
  const [rawData, setRawData] = useState<SalesRow[]>([]);
  const [selectedMes, setSelectedMes] = useState("2026-03");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchVentas();
      setRawData(rows);
      const now = new Date();
      setLastUpdate(now.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false }));
    } catch (err: any) {
      console.error("Error fetching Ventas:", err);
      setError(err.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const meses = useMemo(() => getUniqueMeses(rawData), [rawData]);

  const filteredData = useMemo(() => {
    if (selectedMes === "all") return rawData;
    return rawData.filter((r) => r.mes_id === selectedMes);
  }, [rawData, selectedMes]);

  const metrics = useMemo(
    () => (filteredData.length > 0 ? calculateMetrics(filteredData, rawData) : EMPTY_METRICS),
    [filteredData, rawData]
  );

  const hasData = rawData.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        meses={meses}
        selectedMes={selectedMes}
        onMesChange={setSelectedMes}
        onRefresh={loadData}
        hasData={hasData}
        loading={loading}
        lastUpdate={lastUpdate}
      />

      <div className="mx-auto max-w-[1440px] space-y-6 p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">Cargando datos desde Supabase…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-destructive/30 py-32">
            <FileSpreadsheet className="h-16 w-16 text-destructive/40" />
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground">Error al cargar datos</h2>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border py-32">
            <FileSpreadsheet className="h-16 w-16 text-muted-foreground/40" />
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground">No hay datos en la tabla Ventas</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Verifica que la tabla "Ventas" tenga registros en Supabase.
              </p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="resumen" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="resumen">Resumen</TabsTrigger>
              <TabsTrigger value="panorama">Panorama</TabsTrigger>
              <TabsTrigger value="tendencias">Tendencias</TabsTrigger>
              <TabsTrigger value="metas">Metas</TabsTrigger>
              <TabsTrigger value="logistica">Logística Avanzada</TabsTrigger>
              <TabsTrigger value="kpis-operativos">KPIs Operativos</TabsTrigger>
            </TabsList>

            <TabsContent value="resumen" className="space-y-6">
              <KPICards metrics={metrics} />
              <AnalyticsSection data={filteredData} />
              <DataTable data={filteredData} />
            </TabsContent>

            <TabsContent value="panorama" className="space-y-6">
              <PanoramaSection data={filteredData} rawData={rawData} />
            </TabsContent>

            <TabsContent value="tendencias">
              <TrendsSection data={rawData} />
            </TabsContent>

            <TabsContent value="metas">
              <GoalsSection data={rawData} selectedMes={selectedMes} />
            </TabsContent>

            <TabsContent value="logistica">
              <LogisticaAvanzadaSection />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Index;
