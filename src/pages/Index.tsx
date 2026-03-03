import { useState, useCallback, useMemo } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import KPICards from "@/components/dashboard/KPICards";
import DataTable from "@/components/dashboard/DataTable";
import {
  parseCSV,
  calculateMetrics,
  getUniqueMeses,
  type SalesRow,
  type DashboardMetrics,
} from "@/lib/csv-processor";
import { FileSpreadsheet } from "lucide-react";

const EMPTY_METRICS: DashboardMetrics = {
  totalOrdenes: 0,
  totalUnidades: 0,
  totalRevenue: 0,
  tasaExito: 0,
  aov: 0,
  upo: 0,
  enTransito: 0,
  pendientes: 0,
  semCrecimiento: 0,
  diaOrdenesHoy: 0,
};

const Index = () => {
  const [rawData, setRawData] = useState<SalesRow[]>([]);
  const [selectedMes, setSelectedMes] = useState("all");

  const meses = useMemo(() => getUniqueMeses(rawData), [rawData]);

  const filteredData = useMemo(() => {
    if (selectedMes === "all") return rawData;
    return rawData.filter((r) => r.mes_id === selectedMes);
  }, [rawData, selectedMes]);

  const metrics = useMemo(
    () => (filteredData.length > 0 ? calculateMetrics(filteredData) : EMPTY_METRICS),
    [filteredData]
  );

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const rows = await parseCSV(file);
      setRawData(rows);
      setSelectedMes("all");
    } catch (err) {
      console.error("Error parsing CSV:", err);
    }
  }, []);

  const hasData = rawData.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        meses={meses}
        selectedMes={selectedMes}
        onMesChange={setSelectedMes}
        semCrecimiento={metrics.semCrecimiento}
        diaOrdenesHoy={metrics.diaOrdenesHoy}
        onFileUpload={handleFileUpload}
        hasData={hasData}
      />

      <div className="mx-auto max-w-[1440px] space-y-6 p-6">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border py-32">
            <FileSpreadsheet className="h-16 w-16 text-muted-foreground/40" />
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground">Carga tu archivo CSV de ventas</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Usa el botón superior para subir tu archivo y visualizar los KPIs en tiempo real.
              </p>
            </div>
          </div>
        ) : (
          <>
            <KPICards metrics={metrics} />
            <DataTable data={filteredData} />
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
