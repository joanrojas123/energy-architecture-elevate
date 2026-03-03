import Papa from "papaparse";

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

function col(row: any, ...names: string[]): string {
  for (const n of names) {
    if (row[n] !== undefined && row[n] !== null && row[n] !== "") return row[n].toString().trim();
  }
  return "";
}

function colNum(row: any, ...names: string[]): number {
  const v = col(row, ...names);
  return parseFloat(v) || 0;
}

/**
 * Step 1: Parse CSV
 * Step 2: Radical deduplication by order_id + producto
 */
export function parseCSV(file: File): Promise<SalesRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const seen = new Set<string>();
        const rows: SalesRow[] = [];

        for (const raw of results.data as any[]) {
          const order_id = col(raw, "order_id", "Order_ID", "ORDER_ID");
          const producto = col(raw, "producto", "Producto", "PRODUCTO", "product", "Product");
          const dedupKey = `${order_id}||${producto}`;

          if (seen.has(dedupKey)) continue;
          seen.add(dedupKey);

          rows.push({
            ...raw,
            order_id,
            producto,
            unidades: colNum(raw, "unidades", "Unidades", "UNIDADES"),
            pvp_total: colNum(raw, "pvp_total", "PVP_Total", "PVP_TOTAL"),
            estado_actual: col(raw, "estado_actual", "Estado_Actual", "ESTADO_ACTUAL"),
            transportadora: col(raw, "transportadora", "Transportadora", "TRANSPORTADORA"),
            marca: col(raw, "marca_proveedor", "Marca_Proveedor", "MARCA_PROVEEDOR", "marca", "Marca", "MARCA"),
            estrella_nombre: col(raw, "estrella_nombre", "Estrella_Nombre", "ESTRELLA_NOMBRE", "estrella", "Estrella"),
            ciudad: col(raw, "ciudad", "Ciudad", "CIUDAD"),
            fecha_creacion: col(raw, "fecha_hora_creacion", "Fecha_Hora_Creacion", "FECHA_HORA_CREACION", "fecha_creacion", "Fecha_Creacion"),
            fecha_creacion_dia: col(raw, "fecha_creacion_dia", "Fecha_Creacion_Dia", "FECHA_CREACION_DIA"),
            mes_id: col(raw, "mes_id", "Mes_ID", "MES_ID"),
            semana: col(raw, "semana", "Semana", "SEMANA"),
            semana_del_anio: colNum(raw, "semana_del_anio", "Semana_Del_Anio", "SEMANA_DEL_ANIO"),
          });
        }

        resolve(rows);
      },
      error(err) { reject(err); },
    });
  });
}

export function calculateMetrics(rows: SalesRow[]): DashboardMetrics {
  // All unique order IDs
  const allUniqueOrders = new Set(rows.map((r) => r.order_id));
  const totalOrdenes = allUniqueOrders.size;

  // Active rows (not cancelled/rejected)
  const activeRows = rows.filter((r) => !ESTADOS_EXCLUIDOS.includes(normalize(r.estado_actual)));

  // Total Unidades from deduplicated active rows
  const totalUnidades = activeRows.reduce((sum, r) => sum + r.unidades, 0);

  // Revenue: pvp_total once per unique order_id (active only)
  const seenOrders = new Map<string, number>();
  for (const r of activeRows) {
    if (!seenOrders.has(r.order_id)) {
      seenOrders.set(r.order_id, r.pvp_total);
    }
  }
  const totalRevenue = Array.from(seenOrders.values()).reduce((sum, pvp) => sum + pvp, 0);

  // Tasa de Éxito
  const entregadoOrders = new Set(
    rows.filter((r) => normalize(r.estado_actual) === "entregado").map((r) => r.order_id)
  );
  const tasaExito = totalOrdenes > 0 ? (entregadoOrders.size / totalOrdenes) * 100 : 0;

  // AOV & UPO
  const aov = totalOrdenes > 0 ? totalRevenue / totalOrdenes : 0;
  const upo = totalOrdenes > 0 ? totalUnidades / totalOrdenes : 0;

  // Pipeline Logístico
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

  // Salud del Negocio
  const marcasUnicas = new Set(rows.map((r) => r.marca).filter(Boolean)).size;
  const estrellasUnicas = new Set(rows.map((r) => r.estrella_nombre).filter(Boolean)).size;

  // WoW growth by semana_del_anio
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

  // Fallback: use semana string if semana_del_anio not available
  if (weekNums.length < 2) {
    const semanas = [...new Set(rows.map((r) => r.semana))].filter(Boolean).sort();
    if (semanas.length >= 2) {
      const lastW = new Set(rows.filter((r) => r.semana === semanas[semanas.length - 1]).map((r) => r.order_id)).size;
      const prevW = new Set(rows.filter((r) => r.semana === semanas[semanas.length - 2]).map((r) => r.order_id)).size;
      semCrecimiento = prevW > 0 ? ((lastW - prevW) / prevW) * 100 : 0;
    }
  }

  // DIA: today = 2026-03-03
  const today = "2026-03-03";
  const todayMatches = (fecha: string) =>
    fecha.includes(today) || fecha.includes("03/03/2026") || fecha.includes("3/3/2026") ||
    fecha.includes("2026-03-03") || fecha.includes("03-03-2026");

  const todayRows = rows.filter((r) => todayMatches(r.fecha_creacion_dia) || todayMatches(r.fecha_creacion));
  const todayOrderIds = new Set(todayRows.map((r) => r.order_id));
  const diaOrdenesHoy = todayOrderIds.size;

  // DIA Revenue: pvp_total once per unique order today (active)
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
