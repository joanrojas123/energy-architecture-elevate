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
  semCrecimiento: number;
  diaOrdenesHoy: number;
  diaRevenueHoy: number;
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
    // Extract mes_id as YYYY-MM from fecha
    const mesMatch = fecha.match(/^(\d{4}-\d{2})/);
    const mes_id = mesMatch ? mesMatch[1] : "";

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

export function calculateMetrics(rows: SalesRow[]): DashboardMetrics {
  const allUniqueOrders = new Set(rows.map((r) => r.order_id));
  const totalOrdenes = allUniqueOrders.size;

  const activeRows = rows.filter((r) => !ESTADOS_EXCLUIDOS.includes(normalize(r.estado_actual)));
  const totalUnidades = activeRows.reduce((sum, r) => sum + r.unidades, 0);

  const seenOrders = new Map<string, number>();
  for (const r of activeRows) {
    if (!seenOrders.has(r.order_id)) {
      seenOrders.set(r.order_id, r.pvp_total);
    }
  }
  const totalRevenue = Array.from(seenOrders.values()).reduce((sum, pvp) => sum + pvp, 0);

  const entregadoOrders = new Set(
    rows.filter((r) => normalize(r.estado_actual) === "entregado").map((r) => r.order_id)
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

  const marcasUnicas = new Set(rows.map((r) => r.marca).filter(Boolean)).size;
  const estrellasUnicas = new Set(rows.map((r) => r.estrella_nombre).filter(Boolean)).size;

  // WoW growth
  const weekMap = new Map<number, Set<string>>();
  for (const r of rows) {
    if (r.semana_del_anio > 0) {
      if (!weekMap.has(r.semana_del_anio)) weekMap.set(r.semana_del_anio, new Set());
      weekMap.get(r.semana_del_anio)!.add(r.order_id);
    }
  }
  let semCrecimiento = 0;
  const weekNums = [...weekMap.keys()].sort((a, b) => a - b);
  if (weekNums.length >= 2) {
    const last = weekMap.get(weekNums[weekNums.length - 1])!.size;
    const prev = weekMap.get(weekNums[weekNums.length - 2])!.size;
    semCrecimiento = prev > 0 ? ((last - prev) / prev) * 100 : 0;
  }

  // DIA: today = 2026-03-03
  const today = "2026-03-03";
  const todayRows = rows.filter((r) => r.fecha_creacion_dia.includes(today));
  const todayOrderIds = new Set(todayRows.map((r) => r.order_id));
  const diaOrdenesHoy = todayOrderIds.size;

  const todayActive = todayRows.filter((r) => !ESTADOS_EXCLUIDOS.includes(normalize(r.estado_actual)));
  const seenToday = new Map<string, number>();
  for (const r of todayActive) {
    if (!seenToday.has(r.order_id)) seenToday.set(r.order_id, r.pvp_total);
  }
  const diaRevenueHoy = Array.from(seenToday.values()).reduce((sum, v) => sum + v, 0);

  return {
    totalOrdenes, totalUnidades, totalRevenue, tasaExito, aov, upo,
    enTransito, pendientes, totalEntregadas, canceladasRechazadas,
    marcasUnicas, estrellasUnicas, semCrecimiento, diaOrdenesHoy, diaRevenueHoy,
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
