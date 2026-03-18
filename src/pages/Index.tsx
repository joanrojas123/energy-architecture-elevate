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
import ResumenFilters from "@/components/dashboard/ResumenFilters";
import {
  fetchVentas,
  calculateMetrics,
  getUniqueMeses,
  getUniqueValues,
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
  const [filterMarca, setFilterMarca] = useState("all");
  const [filterEstrella, setFilterEstrella] = useState("all");
  const [filterEstado, setFilterEstado] = useState("all");
  const [filterTransportadora, setFilterTransportadora] = useState("all");
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [filterFechaDesde, setFilterFechaDesde] = useState<Date | undefined>(undefined);
  const [filterFechaHasta, setFilterFechaHasta] = useState<Date | undefined>(undefined);

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
  const opcionesMarcas = useMemo(() => getUniqueValues(rawData, "marca"), [rawData]);
  const opcionesEstrellas = useMemo(() => getUniqueValues(rawData, "estrella_nombre"), [rawData]);
  const opcionesEstados = useMemo(() => getUniqueValues(rawData, "estado_actual"), [rawData]);
  const opcionesTransportadoras = useMemo(() => getUniqueValues(rawData, "shipping_company"), [rawData]);
  const opcionesCategorias = useMemo(() => getUniqueValues(rawData, "categoria"), [rawData]);

  const clearFilters = () => {
    setFilterMarca("all"); setFilterEstrella("all"); setFilterEstado("all");
    setFilterTransportadora("all"); setFilterCategoria("all");
    setFilterFechaDesde(undefined); setFilterFechaHasta(undefined);
  };

  const filteredData = useMemo(() => {
    let d = selectedMes === "all" ? rawData : rawData.filter((r) => r.mes_id === selectedMes);
    if (filterEstado !== "all") d = d.filter((r) => r.estado_actual === filterEstado);
    if (filterMarca !== "all") d = d.filter((r) => r.marca === filterMarca);
    if (filterEstrella !== "all") d = d.filter((r) => r.estrella_nombre === filterEstrella);
    if (filterTransportadora !== "all") d = d.filter((r) => r.shipping_company === filterTransportadora);
    if (filterCategoria !== "all") d = d.filter((r) => r.categoria === filterCategoria);
    if (filterFechaDesde || filterFechaHasta) {
      d = d.filter((r) => {
        if (!r.fecha_creacion) return false;
        const parts = r.fecha_creacion.split("/");
        if (parts.length !== 3) return false;
        const date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
        if (isNaN(date.getTime())) return false;
        if (filterFechaDesde && date < filterFechaDesde) return false;
        if (filterFechaHasta) {
          const hasta = new Date(filterFechaHasta);
          hasta.setHours(23, 59, 59, 999);
          if (date > hasta) return false;
        }
        return true;
      });
    }
    return d;
  }, [rawData, selectedMes, filterEstado, filterMarca, filterEstrella,
      filterTransportadora, filterCategoria, filterFechaDesde, filterFechaHasta]);

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
           <TabsTrigger value="panorama" className="hidden">Panorama</TabsTrigger>
           <TabsTrigger value="tendencias" className="hidden">Tendencias</TabsTrigger>
           <TabsTrigger value="metas" className="hidden">Metas</TabsTrigger>
           <TabsTrigger value="logistica" className="hidden">Logística Avanzada</TabsTrigger>
           <TabsTrigger value="kpis-operativos" className="hidden">KPIs Logística</TabsTrigger>
          </TabsList>

          <TabsContent value="resumen" className="space-y-6">
              <ResumenFilters
                marcas={opcionesMarcas}
                estrellas={opcionesEstrellas}
                estados={opcionesEstados}
                transportadoras={opcionesTransportadoras}
                categorias={opcionesCategorias}
                filterMarca={filterMarca}
                filterEstrella={filterEstrella}
                filterEstado={filterEstado}
                filterTransportadora={filterTransportadora}
                filterCategoria={filterCategoria}
                filterFechaDesde={filterFechaDesde}
                filterFechaHasta={filterFechaHasta}
                setFilterMarca={setFilterMarca}
                setFilterEstrella={setFilterEstrella}
                setFilterEstado={setFilterEstado}
                setFilterTransportadora={setFilterTransportadora}
                setFilterCategoria={setFilterCategoria}
                setFilterFechaDesde={setFilterFechaDesde}
                setFilterFechaHasta={setFilterFechaHasta}
                onClear={clearFilters}
              />
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

            <TabsContent value="kpis-operativos" className="space-y-6">
              <KPIsOperativosSection />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Index;
