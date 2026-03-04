import { useMemo, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { isLostOrder, getUniqueValues, type SalesRow } from "@/lib/csv-processor";
import { Search } from "lucide-react";

interface DataTableProps {
  data: SalesRow[];
}

const PAGE_SIZE = 25;

const DataTable = ({ data }: DataTableProps) => {
  const [transportadora, setTransportadora] = useState("all");
  const [marca, setMarca] = useState("all");
  const [estado, setEstado] = useState("all");
  const [ciudad, setCiudad] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const transportadoras = useMemo(() => getUniqueValues(data, "shipping_company"), [data]);
  const marcas = useMemo(() => getUniqueValues(data, "marca"), [data]);
  const estados = useMemo(() => getUniqueValues(data, "estado_actual"), [data]);
  const ciudades = useMemo(() => getUniqueValues(data, "ciudad"), [data]);

  const filtered = useMemo(() => {
    let result = data;
    if (transportadora !== "all") result = result.filter((r) => r.shipping_company === transportadora);
    if (marca !== "all") result = result.filter((r) => r.marca === marca);
    if (estado !== "all") result = result.filter((r) => r.estado_actual === estado);
    if (ciudad !== "all") result = result.filter((r) => r.ciudad === ciudad);
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
  }, [data, transportadora, marca, estado, ciudad, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <h2 className="text-lg font-semibold">Tabla Maestra de Pedidos</h2>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="h-9 w-[180px] bg-background pl-8 text-sm"
            />
          </div>
          <Select value={transportadora} onValueChange={(v) => { setTransportadora(v); setPage(0); }}>
            <SelectTrigger className="h-9 w-[150px] bg-background text-sm"><SelectValue placeholder="Transportadora" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {transportadoras.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={marca} onValueChange={(v) => { setMarca(v); setPage(0); }}>
            <SelectTrigger className="h-9 w-[130px] bg-background text-sm"><SelectValue placeholder="Marca" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {marcas.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={ciudad} onValueChange={(v) => { setCiudad(v); setPage(0); }}>
            <SelectTrigger className="h-9 w-[140px] bg-background text-sm"><SelectValue placeholder="Ciudad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {ciudades.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(0); }}>
            <SelectTrigger className="h-9 w-[150px] bg-background text-sm"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {estados.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
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
                    <TableCell className="text-sm whitespace-nowrap">{row.hora_col}</TableCell>
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
