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
  externalid_dropi: string;
  hora_col: string;
  client_email: string;
  client_phone: string;
  state: string;
  shipping_company: string;
  shipping_guide: string;
  variation_attributes: string;
  variation_costo: number;
  product_cost_provider: number;
  provider_name: string;
  estrella_type: string;
  estrella_city: string;
  estrella_status: string;
  estrella_inactivity_segment: string;
  rate_type: string;
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

    const str = (v: any) => (v || "").toString().trim();

    rows.push({
      order_id,
      producto,
      unidades: parseFloat(raw.product_quantity) || 0,
      pvp_total: parseFloat(raw.variation_PVPconIVA) || 0,
      estado_actual: str(raw.order_final_status),
      transportadora: str(raw.shippingCompany),
      marca: str(raw.brand_name),
      estrella_nombre: str(raw.estrella_full_name),
      ciudad: str(raw.city),
      fecha_creacion: fecha,
      fecha_creacion_dia: fecha,
      mes_id,
      semana: "",
      semana_del_anio: parseInt(raw.semana_del_anio) || 0,
      margen_neto: parseFloat(raw.Margen_Neto_Operativo) || 0,
      categoria: str(raw.product_category_name),
      cliente: str(raw.client_full_name),
      externalid_dropi: str(raw.Externalid_dropi),
      hora_col: str(raw.HoraCOL_createdAt_utc5),
      client_email: str(raw.clientEmail),
      client_phone: str(raw.clientPhone),
      state: str(raw.state),
      shipping_company: str(raw.shippingCompany),
      shipping_guide: str(raw.shippingGuide),
      variation_attributes: str(raw.variation_attributes_summary),
      variation_costo: parseFloat(raw.variation_costo_conIVA) || 0,
      product_cost_provider: parseFloat(raw.product_cost_provider) || 0,
      provider_name: str(raw.provider_name),
      estrella_type: str(raw.estrella_type),
      estrella_city: str(raw.estrella_city),
      estrella_status: str(raw.estrella_status),
      estrella_inactivity_segment: str(raw.estrella_inactivity_segment),
      rate_type: str(raw.rateType),
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

  // --- HOY: dynamic M/D/YYYY format matching Fecha_sin_hora_UTC ---
  const now = new Date();
  const fechaHoy = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
  const todayActive = activeRows.filter((r) =>
    r.fecha_creacion_dia && r.fecha_creacion_dia.trim() === fechaHoy
  );
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
