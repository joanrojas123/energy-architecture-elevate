import { useMemo, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { isLostOrder, getUniqueValues, type SalesRow } from "@/lib/csv-processor";
import { Search, CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DataTableProps {
  data: SalesRow[];
}

const PAGE_SIZE = 25;

/** Parse M/D/YYYY string to Date */
function parseMDY(s: string): Date | null {
  if (!s) return null;
  const parts = s.split("/");
  if (parts.length !== 3) return null;
  const m = parseInt(parts[0], 10);
  const d = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);
  if (isNaN(m) || isNaN(d) || isNaN(y)) return null;
  return new Date(y, m - 1, d);
}

/** Extract HH:MM from hora_col which may be a full ISO string or just time */
function formatHora(raw: string): string {
  if (!raw) return "";
  // If it contains "T" it's ISO-like, extract time part
  if (raw.includes("T")) {
    const timePart = raw.split("T")[1];
    if (timePart) return timePart.substring(0, 5);
  }
  // If it contains a space, take what's after the last space (time portion)
  if (raw.includes(" ")) {
    const parts = raw.trim().split(" ");
    const timePart = parts[parts.length - 1];
    if (timePart && timePart.includes(":")) return timePart.substring(0, 5);
  }
  // If it already looks like HH:MM or HH:MM:SS, truncate
  if (raw.includes(":")) return raw.substring(0, 5);
  return raw;
}

const DataTable = ({ data }: DataTableProps) => {
  const [estado, setEstado] = useState("all");
  const [marca, setMarca] = useState("all");
  const [estrella, setEstrella] = useState("all");
  const [transportadora, setTransportadora] = useState("all");
  const [producto, setProducto] = useState("all");
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(undefined);
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const estados = useMemo(() => getUniqueValues(data, "estado_actual"), [data]);
  const marcas = useMemo(() => getUniqueValues(data, "marca"), [data]);
  const estrellas = useMemo(() => getUniqueValues(data, "estrella_nombre"), [data]);
  const transportadoras = useMemo(() => getUniqueValues(data, "shipping_company"), [data]);
  const productos = useMemo(() => getUniqueValues(data, "producto"), [data]);

  const filtered = useMemo(() => {
    let result = data;
    if (estado !== "all") result = result.filter((r) => r.estado_actual === estado);
    if (marca !== "all") result = result.filter((r) => r.marca === marca);
    if (estrella !== "all") result = result.filter((r) => r.estrella_nombre === estrella);
    if (transportadora !== "all") result = result.filter((r) => r.shipping_company === transportadora);
    if (producto !== "all") result = result.filter((r) => r.producto === producto);
    if (fechaDesde || fechaHasta) {
      result = result.filter((r) => {
        const d = parseMDY(r.fecha_creacion);
        if (!d) return false;
        if (fechaDesde && d < fechaDesde) return false;
        if (fechaHasta) {
          const hasta = new Date(fechaHasta);
          hasta.setHours(23, 59, 59, 999);
          if (d > hasta) return false;
        }
        return true;
      });
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.order_id.toLowerCase().includes(q) ||
          r.estado_actual.toLowerCase().includes(q) ||
          r.marca.toLowerCase().includes(q) ||
          r.estrella_nombre.toLowerCase().includes(q) ||
          r.cliente.toLowerCase().includes(q) ||
          r.producto.toLowerCase().includes(q)
      );
    }
    return result;
  }, [data, estado, marca, estrella, transportadora, producto, fechaDesde, fechaHasta, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

  const FilterSelect = ({ value, onChange, placeholder, options, defaultLabel }: {
    value: string; onChange: (v: string) => void; placeholder: string; options: string[]; defaultLabel: string;
  }) => (
    <Select value={value} onValueChange={(v) => { onChange(v); setPage(0); }}>
      <SelectTrigger className="h-8 w-[140px] bg-background text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{defaultLabel}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const DateFilter = ({ label, value, onChange }: { label: string; value: Date | undefined; onChange: (d: Date | undefined) => void }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("h-8 w-[130px] justify-start text-left text-xs font-normal", !value && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-1.5 h-3 w-3" />
          {value ? format(value, "d/M/yyyy") : label}
          {value && (
            <X
              className="ml-auto h-3 w-3 opacity-60 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); onChange(undefined); setPage(0); }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => { onChange(d); setPage(0); }}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Tabla Maestra de Pedidos</h2>
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="h-8 w-[180px] bg-background pl-8 text-xs"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect value={estado} onChange={setEstado} placeholder="Estado" options={estados} defaultLabel="Todos los estados" />
          <FilterSelect value={marca} onChange={setMarca} placeholder="Marca" options={marcas} defaultLabel="Todas las marcas" />
          <FilterSelect value={estrella} onChange={setEstrella} placeholder="Estrella" options={estrellas} defaultLabel="Todas las estrellas" />
          <FilterSelect value={transportadora} onChange={setTransportadora} placeholder="Transportadora" options={transportadoras} defaultLabel="Todas" />
          <FilterSelect value={producto} onChange={setProducto} placeholder="Producto" options={productos} defaultLabel="Todos los productos" />
          <div className="flex items-center gap-1.5">
            <DateFilter label="Desde" value={fechaDesde} onChange={setFechaDesde} />
            <span className="text-xs text-muted-foreground">—</span>
            <DateFilter label="Hasta" value={fechaHasta} onChange={setFechaHasta} />
          </div>
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
