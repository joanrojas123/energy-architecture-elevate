import { supabase } from "./supabase";

export interface SalesRow {
  order_id: string;
  producto: string;
  unidades: number;
  pvp_total: number;
  estado_actual: string;
  transportadora: string;
  marca: string;
  estrella_nombre: string;
  ciudad: string;
  fecha_creacion: string;
  fecha_creacion_dia: string;
  mes_id: string;
  semana: string;
  semana_del_anio: number;
  margen_neto: number;
  categoria: string;
  cliente: string;
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
  totalEntregadas: number;
  canceladasRechazadas: number;
  marcasUnicas: number;
  estrellasUnicas: number;
  diaOrdenesHoy: number;
  diaRevenueHoy: number;
  semOrdenesActual: number;
  semOrdenesAnterior: number;
  semOrdenesCrecimiento: number;
  semRevenueActual: number;
  semRevenueAnterior: number;
  semRevenueCrecimiento: number;
}

const ESTADOS_EXCLUIDOS = ["cancelado", "rechazado"];

const ESTADOS_EN_TRANSITO = [
  "despachada", "en bodega destino", "en bodega origen", "en transito",
  "novedad", "en reparto", "preparado para transportadora", "en reexpedicion",
  "en espera de ruta domestica", "en ruta", "en bodega principal",
  "en camino", "en espera de rx", "sin movimientos",
];

const ESTADOS_PENDIENTES = ["pendiente", "guía generada"];

function normalize(str: string): string {
  return (str || "").toString().trim().toLowerCase();
}

/**
 * Fetch all rows from Supabase "Ventas" table and map columns.
 * Then deduplicate by order_id + producto.
 */
export async function fetchVentas(): Promise<SalesRow[]> {
  // Fetch all rows (paginated to bypass 1000-row default)
  let allData: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let done = false;

  while (!done) {
    const { data, error } = await supabase
      .from("Ventas")
      .select("*")
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Error fetching Ventas: ${error.message}`);
    if (!data || data.length === 0) {
      done = true;
    } else {
      allData = allData.concat(data);
      if (data.length < pageSize) done = true;
      from += pageSize;
    }
  }

  // Map Supabase columns to SalesRow & deduplicate
  const seen = new Set<string>();
  const rows: SalesRow[] = [];

  for (const raw of allData) {
    const order_id = (raw.order_id || "").toString().trim();
    const producto = (raw.product_name || "").toString().trim();
    const dedupKey = `${order_id}||${producto}`;

    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    const fecha = (raw.Fecha_sin_hora_UTC || "").toString().trim();
    const mes_id = (raw.period || "").toString().trim();

    rows.push({
      order_id,
      producto,
      unidades: parseFloat(raw.product_quantity) || 0,
      pvp_total: parseFloat(raw.variation_PVPconIVA) || 0,
      estado_actual: (raw.order_final_status || "").toString().trim(),
      transportadora: "",
      marca: (raw.brand_name || "").toString().trim(),
      estrella_nombre: (raw.estrella_full_name || "").toString().trim(),
      ciudad: (raw.city || "").toString().trim(),
      fecha_creacion: fecha,
      fecha_creacion_dia: fecha,
      mes_id,
      semana: "",
      semana_del_anio: parseInt(raw.semana_del_anio) || 0,
      margen_neto: parseFloat(raw.Margen_Neto_Operativo) || 0,
      categoria: (raw.product_category_name || "").toString().trim(),
      cliente: (raw.client_full_name || "").toString().trim(),
    });
  }

  return rows;
}

export function calculateMetrics(rows: SalesRow[], allRows?: SalesRow[]): DashboardMetrics {
  const activeRows = rows.filter((r) => !ESTADOS_EXCLUIDOS.includes(normalize(r.estado_actual)));

  // Total Órdenes: DISTINCT order_id excluding cancelado/rechazado
  const activeOrderIds = new Set(activeRows.map((r) => r.order_id));
  const totalOrdenes = activeOrderIds.size;

  // Total Unidades: SUM product_quantity excluding cancelado/rechazado
  const totalUnidades = activeRows.reduce((sum, r) => sum + r.unidades, 0);

  // Revenue PVP: SUM(pvp_total × unidades) excluding cancelado/rechazado
  const totalRevenue = activeRows.reduce((sum, r) => sum + r.pvp_total * r.unidades, 0);

  // Tasa de Éxito: entregado orders / total active orders
  const entregadoOrders = new Set(
    activeRows.filter((r) => normalize(r.estado_actual) === "entregado").map((r) => r.order_id)
  );
  const tasaExito = totalOrdenes > 0 ? (entregadoOrders.size / totalOrdenes) * 100 : 0;

  const aov = totalOrdenes > 0 ? totalRevenue / totalOrdenes : 0;
  const upo = totalOrdenes > 0 ? totalUnidades / totalOrdenes : 0;

  const totalEntregadas = entregadoOrders.size;
  const enTransito = new Set(
    rows.filter((r) => ESTADOS_EN_TRANSITO.includes(normalize(r.estado_actual))).map((r) => r.order_id)
  ).size;
  const pendientes = new Set(
    rows.filter((r) => ESTADOS_PENDIENTES.includes(normalize(r.estado_actual))).map((r) => r.order_id)
  ).size;
  const canceladasRechazadas = new Set(
    rows.filter((r) => ESTADOS_EXCLUIDOS.includes(normalize(r.estado_actual))).map((r) => r.order_id)
  ).size;

  const marcasUnicas = new Set(activeRows.map((r) => r.marca).filter(Boolean)).size;
  const estrellasUnicas = new Set(activeRows.map((r) => r.estrella_nombre).filter(Boolean)).size;

  // --- HOY: 3/3/2026 (M/D/YYYY format matching Fecha_sin_hora_UTC) ---
  const today = "3/3/2026";
  const todayActive = activeRows.filter((r) => r.fecha_creacion_dia === today);
  const diaOrdenesHoy = new Set(todayActive.map((r) => r.order_id)).size;
  const diaRevenueHoy = todayActive.reduce((sum, r) => sum + r.pvp_total * r.unidades, 0);

  // --- WoW uses ALL rows to compare across months ---
  const wowSource = allRows || rows;
  const currentWeek = 10;
  const prevWeek = 9;

  // WoW uses ALL rows (not just filtered by month), filtering by period+week
  const weekActiveRows = (wk: number, period: string) =>
    wowSource.filter((r) =>
      !ESTADOS_EXCLUIDOS.includes(normalize(r.estado_actual)) &&
      r.semana_del_anio === wk &&
      r.mes_id === period
    );

  const currentWeekRows = weekActiveRows(currentWeek, "2026-03");
  const prevWeekRows = weekActiveRows(prevWeek, "2026-02");

  const semOrdenesActual = new Set(currentWeekRows.map((r) => r.order_id)).size;
  const semOrdenesAnterior = new Set(prevWeekRows.map((r) => r.order_id)).size;
  const semOrdenesCrecimiento = semOrdenesAnterior > 0
    ? ((semOrdenesActual - semOrdenesAnterior) / semOrdenesAnterior) * 100 : 0;

  const semRevenueActual = currentWeekRows.reduce((s, r) => s + r.pvp_total * r.unidades, 0);
  const semRevenueAnterior = prevWeekRows.reduce((s, r) => s + r.pvp_total * r.unidades, 0);
  const semRevenueCrecimiento = semRevenueAnterior > 0
    ? ((semRevenueActual - semRevenueAnterior) / semRevenueAnterior) * 100 : 0;

  return {
    totalOrdenes, totalUnidades, totalRevenue, tasaExito, aov, upo,
    enTransito, pendientes, totalEntregadas, canceladasRechazadas,
    marcasUnicas, estrellasUnicas, diaOrdenesHoy, diaRevenueHoy,
    semOrdenesActual, semOrdenesAnterior, semOrdenesCrecimiento,
    semRevenueActual, semRevenueAnterior, semRevenueCrecimiento,
  };
}

export function isLostOrder(estado: string): boolean {
  return ESTADOS_EXCLUIDOS.includes(normalize(estado));
}

export function getUniqueMeses(rows: SalesRow[]): string[] {
  return [...new Set(rows.map((r) => r.mes_id).filter(Boolean))].sort();
}

export function getUniqueValues(rows: SalesRow[], key: keyof SalesRow): string[] {
  return [...new Set(rows.map((r) => (r[key] || "").toString()).filter(Boolean))].sort();
}
