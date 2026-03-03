import Papa from "papaparse";

export interface SalesRow {
  order_id: string;
  unidades: number;
  pvp_total: number;
  estado_actual: string;
  transportadora: string;
  marca: string;
  ciudad: string;
  fecha_creacion: string;
  mes_id: string;
  semana: string;
  [key: string]: string | number;
}

export interface DashboardMetrics {
  totalOrdenes: number;
  totalUnidades: number;
  totalRevenue: number;
  tasaExito: number;
  aov: number;
  upo: number;
  enTransito: number;
  pendientes: number;
  semCrecimiento: number;
  diaOrdenesHoy: number;
}

const ESTADOS_EXCLUIDOS = ["cancelado", "rechazado"];

const ESTADOS_EN_TRANSITO = [
  "despachada",
  "en bodega destino",
  "en bodega origen",
  "en transito",
  "novedad",
  "en reparto",
  "preparado para transportadora",
  "en reexpedicion",
  "en espera de ruta domestica",
  "en ruta",
  "en bodega principal",
  "en camino",
  "en espera de rx",
  "sin movimientos",
];

const ESTADOS_PENDIENTES = ["pendiente", "guía generada"];

const ESTADOS_PERDIDOS = ["cancelado", "rechazado"];

function normalize(str: string): string {
  return (str || "").toString().trim().toLowerCase();
}

export function parseCSV(file: File): Promise<SalesRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const rows: SalesRow[] = results.data.map((row: any) => ({
          ...row,
          order_id: (row.order_id || row.Order_ID || row.ORDER_ID || "").toString().trim(),
          unidades: parseFloat(row.unidades || row.Unidades || row.UNIDADES || "0") || 0,
          pvp_total: parseFloat(row.pvp_total || row.PVP_Total || row.PVP_TOTAL || "0") || 0,
          estado_actual: (row.estado_actual || row.Estado_Actual || row.ESTADO_ACTUAL || "").toString().trim(),
          transportadora: (row.transportadora || row.Transportadora || row.TRANSPORTADORA || "").toString().trim(),
          marca: (row.marca_proveedor || row.Marca_Proveedor || row.MARCA_PROVEEDOR || row.marca || row.Marca || row.MARCA || "").toString().trim(),
          ciudad: (row.ciudad || row.Ciudad || row.CIUDAD || "").toString().trim(),
          fecha_creacion: (row.fecha_hora_creacion || row.Fecha_Hora_Creacion || row.FECHA_HORA_CREACION || row.fecha_creacion || row.Fecha_Creacion || row.FECHA_CREACION || "").toString().trim(),
          mes_id: (row.mes_id || row.Mes_ID || row.MES_ID || "").toString().trim(),
          semana: (row.semana || row.Semana || row.SEMANA || "").toString().trim(),
        }));
        resolve(rows);
      },
      error(err) {
        reject(err);
      },
    });
  });
}

export function calculateMetrics(rows: SalesRow[]): DashboardMetrics {
  // Total Órdenes: unique order_ids
  const allUniqueOrders = new Set(rows.map((r) => r.order_id));
  const totalOrdenes = allUniqueOrders.size;

  // Rows not cancelled/rejected
  const activeRows = rows.filter((r) => !ESTADOS_EXCLUIDOS.includes(normalize(r.estado_actual)));

  // Total Unidades: sum ALL rows of unidades (excluding cancelado/rechazado)
  const totalUnidades = activeRows.reduce((sum, r) => sum + r.unidades, 0);

  // Total Revenue PVP: pvp_total UNA VEZ por order_id único (excluding cancelado/rechazado)
  // Deduplicate: take pvp_total from the first row of each unique order_id
  const seenOrders = new Map<string, number>();
  for (const r of activeRows) {
    if (!seenOrders.has(r.order_id)) {
      seenOrders.set(r.order_id, r.pvp_total);
    }
  }
  const totalRevenue = Array.from(seenOrders.values()).reduce((sum, pvp) => sum + pvp, 0);
  const activeOrderCount = seenOrders.size;

  // Tasa de Éxito: unique orders with 'entregado' / total unique orders
  const entregadoOrders = new Set(
    rows.filter((r) => normalize(r.estado_actual) === "entregado").map((r) => r.order_id)
  );
  const tasaExito = totalOrdenes > 0 ? (entregadoOrders.size / totalOrdenes) * 100 : 0;

  // AOV = Revenue (deduplicado) / Órdenes únicas activas
  const aov = activeOrderCount > 0 ? totalRevenue / activeOrderCount : 0;

  // UPO = Total Unidades / Total Órdenes únicas
  const upo = totalOrdenes > 0 ? totalUnidades / totalOrdenes : 0;

  // En Tránsito: unique IDs with transit states
  const enTransitoOrders = new Set(
    rows.filter((r) => ESTADOS_EN_TRANSITO.includes(normalize(r.estado_actual))).map((r) => r.order_id)
  );
  const enTransito = enTransitoOrders.size;

  // Pendientes: unique IDs with pending states
  const pendientesOrders = new Set(
    rows.filter((r) => ESTADOS_PENDIENTES.includes(normalize(r.estado_actual))).map((r) => r.order_id)
  );
  const pendientes = pendientesOrders.size;

  // Week-over-Week growth (SEM_Crecimiento)
  const semanas = [...new Set(rows.map((r) => r.semana))].sort();
  let semCrecimiento = 0;
  if (semanas.length >= 2) {
    const lastWeek = semanas[semanas.length - 1];
    const prevWeek = semanas[semanas.length - 2];
    const lastWeekOrders = new Set(rows.filter((r) => r.semana === lastWeek).map((r) => r.order_id)).size;
    const prevWeekOrders = new Set(rows.filter((r) => r.semana === prevWeek).map((r) => r.order_id)).size;
    semCrecimiento = prevWeekOrders > 0 ? ((lastWeekOrders - prevWeekOrders) / prevWeekOrders) * 100 : 0;
  }

  // DIA_Ordenes_Creadas_HOY (based on 3-marzo-2026)
  const today = "2026-03-03";
  const todayOrders = new Set(
    rows.filter((r) => {
      const fecha = r.fecha_creacion;
      return fecha.includes(today) || fecha.includes("03/03/2026") || fecha.includes("3/3/2026");
    }).map((r) => r.order_id)
  );
  const diaOrdenesHoy = todayOrders.size;

  return {
    totalOrdenes,
    totalUnidades,
    totalRevenue,
    tasaExito,
    aov,
    upo,
    enTransito,
    pendientes,
    semCrecimiento,
    diaOrdenesHoy,
  };
}

export function isLostOrder(estado: string): boolean {
  return ESTADOS_PERDIDOS.includes(normalize(estado));
}

export function getUniqueMeses(rows: SalesRow[]): string[] {
  return [...new Set(rows.map((r) => r.mes_id).filter(Boolean))].sort();
}

export function getUniqueValues(rows: SalesRow[], key: keyof SalesRow): string[] {
  return [...new Set(rows.map((r) => (r[key] || "").toString()).filter(Boolean))].sort();
}
