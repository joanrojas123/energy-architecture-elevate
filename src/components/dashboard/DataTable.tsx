import { useMemo, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { isLostOrder, type SalesRow } from "@/lib/csv-processor";
import { Search } from "lucide-react";

interface DataTableProps {
  data: SalesRow[];
}

const PAGE_SIZE = 25;

/** Extract HH:MM from hora_col which may be a full ISO string or just time */
function formatHora(raw: string): string {
  if (!raw) return "";
  if (raw.includes("T")) {
    const timePart = raw.split("T")[1];
    if (timePart) return timePart.substring(0, 5);
  }
  if (raw.includes(" ")) {
    const parts = raw.trim().split(" ");
    const timePart = parts[parts.length - 1];
    if (timePart && timePart.includes(":")) return timePart.substring(0, 5);
  }
  if (raw.includes(":")) return raw.substring(0, 5);
  return raw;
}

const DataTable = ({ data }: DataTableProps) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  // Solo filtramos por el buscador de texto
  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(
      (r) =>
        r.order_id.toLowerCase().includes(q) ||
        r.estado_actual.toLowerCase().includes(q) ||
        r.marca.toLowerCase().includes(q) ||
        r.estrella_nombre.toLowerCase().includes(q) ||
        r.cliente.toLowerCase().includes(q) ||
        r.producto.toLowerCase().includes(q)
    );
  }, [data, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-4">
      {/* Cabecera de la tabla: Solo Título y Buscador */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Tabla Maestra de Pedidos</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en resultados..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="h-9 w-[250px] bg-background pl-9 text-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold whitespace-nowrap">Order ID</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">External ID Dropi</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">Estado</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">Fecha</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">Hora COL</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">Cliente</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">Email</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">Teléfono</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">Ciudad</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">Departamento</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">Transportadora</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">Guía</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">Marca</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">Producto</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">Variación</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">Categoría</TableHead>
              <TableHead className="font-semibold whitespace-nowrap text-right">Unidades</TableHead>
              <TableHead className="font-semibold whitespace-nowrap text-right">PVP Total</TableHead>
              <TableHead className="font-semibold whitespace-nowrap text-right">Costo IVA</TableHead>
              <TableHead className="font-semibold whitespace-nowrap text-right">Costo Proveedor</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">Proveedor</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">Estrella</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">Tipo Estrella</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">Ciudad Estrella</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">Estado Estrella</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">Seg. Inactividad</TableHead>
              <TableHead className="font-semibold whitespace-nowrap">Rate Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={27} className="py-8 text-center text-muted-foreground">
                  No se encontraron registros.
                </TableCell>
              </TableRow>
            ) : (
              paged.map((row, i) => {
                const lost = isLostOrder(row.estado_actual);
                return (
                  <TableRow
                    key={`${row.order_id}-${row.producto}-${i}`}
                    className={lost ? "bg-error/5 hover:bg-error/10" : ""}
                  >
                    <TableCell className="font-mono text-xs whitespace-nowrap">{row.order_id}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{row.externalid_dropi}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                          lost
                            ? "bg-error/10 text-error"
                            : row.estado_actual.toLowerCase() === "entregado"
                            ? "bg-success/10 text-success"
                            : "bg-process/10 text-process"
                        }`}
                      >
                        {row.estado_actual}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{row.fecha_creacion}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{formatHora(row.hora_col)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{row.cliente}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{row.client_email}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{row.client_phone}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{row.ciudad}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{row.state}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{row.shipping_company}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{row.shipping_guide}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{row.marca}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{row.producto}</TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate">{row.variation_attributes}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{row.categoria}</TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">{row.unidades}</TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">{formatCurrency(row.pvp_total)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatCurrency(row.variation_costo)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatCurrency(row.product_cost_provider)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{row.provider_name}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{row.estrella_nombre}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{row.estrella_type}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{row.estrella_city}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{row.estrella_status}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{row.estrella_inactivity_segment}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{row.rate_type}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{filtered.length.toLocaleString()} registros · Página {page + 1} de {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="rounded border border-border px-3 py-1 text-sm hover:bg-muted disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="rounded border border-border px-3 py-1 text-sm hover:bg-muted disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;