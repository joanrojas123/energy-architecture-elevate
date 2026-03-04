import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface LogRow {
  order_id: string;
  shippingCompany: string;
  provider_name: string;
  ciudad_destino: string;
  estado_actual_orden: string;
  ultimo_tramo_alcanzado: string;
  alerta_logistica: string;
  dias_desde_creacion_hasta_hoy: number;
  es_retroceso: string;
}

const TRAMO_ORDEN = [
  "0. Creación de Guía (Marca)",
  "1. Alistamiento (Marca a Bodega Logística)",
  "2. Traslado (Viaje Nacional a Ciudad Destino)",
  "3. Entrega Final (Reparto a Cliente)",
  "4. Cancelación / Devolución",
];

type SortDir = "asc" | "desc";

function estadoBadge(estado: string) {
  const e = estado.toLowerCase().trim();
  if (e === "entregado")
    return <Badge className="bg-success/20 text-success border-success/30 text-[10px]">{estado}</Badge>;
  if (["pendiente", "guía generada", "guia generada"].includes(e))
    return <Badge className="bg-pending/20 text-pending border-pending/30 text-[10px]">{estado}</Badge>;
  if (["en reparto", "en ruta", "en camino", "despachada", "en transito", "en tránsito", "novedad"].includes(e))
    return <Badge className="bg-info/20 text-info border-info/30 text-[10px]">{estado}</Badge>;
  if (["cancelado", "rechazado", "devolucion", "devolución"].includes(e))
    return <Badge variant="destructive" className="text-[10px]">{estado}</Badge>;
  return <Badge variant="secondary" className="text-[10px]">{estado}</Badge>;
}

function tramoBadge(tramo: string) {
  if (tramo.startsWith("0") || tramo.startsWith("1"))
    return <Badge className="bg-pending/20 text-pending border-pending/30 text-[10px]">{tramo}</Badge>;
  if (tramo.startsWith("2"))
    return <Badge className="bg-info/20 text-info border-info/30 text-[10px]">{tramo}</Badge>;
  if (tramo.startsWith("3"))
    return <Badge className="bg-success/20 text-success border-success/30 text-[10px]">{tramo}</Badge>;
  if (tramo.startsWith("4"))
    return <Badge variant="destructive" className="text-[10px]">{tramo}</Badge>;
  return <Badge variant="secondary" className="text-[10px]">{tramo}</Badge>;
}

interface Props {
  data: any[];
}

const LogisticaTablaMaestra = ({ data }: Props) => {
  const [tramoFilter, setTramoFilter] = useState("all");
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ col: string; dir: SortDir }>({ col: "dias", dir: "desc" });
  const PAGE_SIZE = 20;

  // Deduplicate: one row per order_id, keep most advanced tramo
  const deduped = useMemo(() => {
    const map: Record<string, any> = {};
    const hasRetroceso: Record<string, boolean> = {};
    for (const row of data) {
      const id = row.order_id;
      if (row.es_retroceso === "true") hasRetroceso[id] = true;
      if (!map[id]) {
        map[id] = row;
      } else {
        const actual = TRAMO_ORDEN.indexOf(map[id].ultimo_tramo_alcanzado);
        const nueva = TRAMO_ORDEN.indexOf(row.ultimo_tramo_alcanzado);
        if (nueva > actual) map[id] = row;
      }
    }
    return Object.values(map).map((r: any) => ({
      order_id: r.order_id,
      shippingCompany: r.shippingCompany,
      provider_name: r.provider_name,
      ciudad_destino: r.ciudad_destino,
      estado_actual_orden: r.estado_actual_orden,
      ultimo_tramo_alcanzado: r.ultimo_tramo_alcanzado,
      alerta_logistica: r.alerta_logistica,
      dias_desde_creacion_hasta_hoy: parseFloat(r.dias_desde_creacion_hasta_hoy) || 0,
      retroceso: !!hasRetroceso[r.order_id],
    }));
  }, [data]);

  const tramos = useMemo(() => [...new Set(deduped.map((r) => r.ultimo_tramo_alcanzado).filter(Boolean))].sort(), [deduped]);
  const estados = useMemo(() => [...new Set(deduped.map((r) => r.estado_actual_orden).filter(Boolean))].sort(), [deduped]);

  const filtered = useMemo(() => {
    let d = deduped;
    if (tramoFilter !== "all") d = d.filter((r) => r.ultimo_tramo_alcanzado === tramoFilter);
    if (estadoFilter !== "all") d = d.filter((r) => r.estado_actual_orden === estadoFilter);
    if (search.trim()) d = d.filter((r) => r.order_id.toLowerCase().includes(search.trim().toLowerCase()));

    const { col, dir } = sort;
    d = [...d].sort((a, b) => {
      let av: any, bv: any;
      if (col === "dias") { av = a.dias_desde_creacion_hasta_hoy; bv = b.dias_desde_creacion_hasta_hoy; }
      else if (col === "order_id") { av = a.order_id; bv = b.order_id; }
      else if (col === "transportadora") { av = a.shippingCompany; bv = b.shippingCompany; }
      else if (col === "marca") { av = a.provider_name; bv = b.provider_name; }
      else if (col === "ciudad") { av = a.ciudad_destino; bv = b.ciudad_destino; }
      else if (col === "estado") { av = a.estado_actual_orden; bv = b.estado_actual_orden; }
      else if (col === "tramo") { av = a.ultimo_tramo_alcanzado; bv = b.ultimo_tramo_alcanzado; }
      else { av = 0; bv = 0; }
      if (typeof av === "string") return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === "asc" ? av - bv : bv - av;
    });
    return d;
  }, [deduped, tramoFilter, estadoFilter, search, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (col: string) => {
    if (sort.col === col) setSort({ col, dir: sort.dir === "asc" ? "desc" : "asc" });
    else setSort({ col, dir: "desc" });
  };
  const sortIcon = (col: string) => sort.col === col ? (sort.dir === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={tramoFilter} onValueChange={(v) => { setTramoFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[220px] bg-background text-xs h-8"><SelectValue placeholder="Tramo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tramos</SelectItem>
            {tramos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={estadoFilter} onValueChange={(v) => { setEstadoFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px] bg-background text-xs h-8"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {estados.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          placeholder="Buscar order_id…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-[200px] h-8 text-xs"
        />
        <span className="text-[11px] text-muted-foreground ml-auto">{filtered.length} órdenes</span>
      </div>

      {/* Table */}
      <Card className="border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  { col: "order_id", label: "Order ID" },
                  { col: "transportadora", label: "Transportadora" },
                  { col: "marca", label: "Marca" },
                  { col: "ciudad", label: "Ciudad" },
                  { col: "estado", label: "Estado Actual" },
                  { col: "tramo", label: "Tramo Actual" },
                  { col: "alerta", label: "Alerta" },
                  { col: "dias", label: "Días" },
                  { col: "retroceso", label: "Retroceso" },
                ].map((h) => (
                  <TableHead key={h.col} className="cursor-pointer text-[11px] whitespace-nowrap" onClick={() => toggleSort(h.col)}>
                    {h.label}{sortIcon(h.col)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((r) => (
                <TableRow key={r.order_id}>
                  <TableCell className="text-xs font-mono">{r.order_id}</TableCell>
                  <TableCell className="text-xs">{r.shippingCompany}</TableCell>
                  <TableCell className="text-xs">{r.provider_name}</TableCell>
                  <TableCell className="text-xs">{r.ciudad_destino}</TableCell>
                  <TableCell className="text-xs">{estadoBadge(r.estado_actual_orden)}</TableCell>
                  <TableCell className="text-xs">{tramoBadge(r.ultimo_tramo_alcanzado)}</TableCell>
                  <TableCell className="text-xs">
                    <Badge
                      variant={r.alerta_logistica.includes("🔴") ? "destructive" : "secondary"}
                      className={`text-[10px] ${r.alerta_logistica.includes("🟡") ? "bg-pending/20 text-pending border-pending/30" : ""}`}
                    >
                      {r.alerta_logistica}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-semibold">{r.dias_desde_creacion_hasta_hoy.toFixed(0)}</TableCell>
                  <TableCell className="text-xs">
                    {r.retroceso && <span className="text-pending font-semibold">⚠️ Sí</span>}
                  </TableCell>
                </TableRow>
              ))}
              {paged.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-8">Sin resultados</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Página {page + 1} de {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogisticaTablaMaestra;
