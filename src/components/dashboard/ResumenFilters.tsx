import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  } from "@/components/ui/select";
  import { Button } from "@/components/ui/button";
  import { Calendar } from "@/components/ui/calendar";
  import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
  import { CalendarIcon, X, SlidersHorizontal } from "lucide-react";
  import { cn } from "@/lib/utils";
  import { format } from "date-fns";
  
  interface ResumenFiltersProps {
    // Opciones
    marcas: string[];
    estrellas: string[];
    estados: string[];
    transportadoras: string[];
    categorias: string[];
    // Valores actuales
    filterMarca: string;
    filterEstrella: string;
    filterEstado: string;
    filterTransportadora: string;
    filterCategoria: string;
    filterFechaDesde: Date | undefined;
    filterFechaHasta: Date | undefined;
    // Setters
    setFilterMarca: (v: string) => void;
    setFilterEstrella: (v: string) => void;
    setFilterEstado: (v: string) => void;
    setFilterTransportadora: (v: string) => void;
    setFilterCategoria: (v: string) => void;
    setFilterFechaDesde: (d: Date | undefined) => void;
    setFilterFechaHasta: (d: Date | undefined) => void;
    onClear: () => void;
  }
  
  const FilterSelect = ({
    value, onChange, placeholder, options, defaultLabel,
  }: {
    value: string; onChange: (v: string) => void;
    placeholder: string; options: string[]; defaultLabel: string;
  }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[160px] bg-background text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{defaultLabel}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
  
  const DateFilter = ({
    label, value, onChange,
  }: {
    label: string; value: Date | undefined; onChange: (d: Date | undefined) => void;
  }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 w-[130px] justify-start text-left text-xs font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-1.5 h-3 w-3" />
          {value ? format(value, "d/M/yyyy") : label}
          {value && (
            <X
              className="ml-auto h-3 w-3 opacity-60 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); onChange(undefined); }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
  
  const ResumenFilters = (props: ResumenFiltersProps) => {
    const {
      marcas, estrellas, estados, transportadoras, categorias,
      filterMarca, filterEstrella, filterEstado, filterTransportadora, filterCategoria,
      filterFechaDesde, filterFechaHasta,
      setFilterMarca, setFilterEstrella, setFilterEstado,
      setFilterTransportadora, setFilterCategoria,
      setFilterFechaDesde, setFilterFechaHasta,
      onClear,
    } = props;
  
    const hasFilters =
      filterMarca !== "all" || filterEstrella !== "all" || filterEstado !== "all" ||
      filterTransportadora !== "all" || filterCategoria !== "all" ||
      filterFechaDesde !== undefined || filterFechaHasta !== undefined;
  
    return (
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Filtros globales
          </span>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 text-xs text-muted-foreground hover:text-foreground"
              onClick={onClear}
            >
              <X className="mr-1 h-3 w-3" /> Limpiar
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            value={filterEstado} onChange={setFilterEstado}
            placeholder="Estado" options={estados} defaultLabel="Todos los estados"
          />
          <FilterSelect
            value={filterMarca} onChange={setFilterMarca}
            placeholder="Marca" options={marcas} defaultLabel="Todas las marcas"
          />
          <FilterSelect
            value={filterEstrella} onChange={setFilterEstrella}
            placeholder="Estrella" options={estrellas} defaultLabel="Todas las estrellas"
          />
          <FilterSelect
            value={filterTransportadora} onChange={setFilterTransportadora}
            placeholder="Transportadora" options={transportadoras} defaultLabel="Todas"
          />
          <FilterSelect
            value={filterCategoria} onChange={setFilterCategoria}
            placeholder="Categoría" options={categorias} defaultLabel="Todas las categorías"
          />
          <div className="flex items-center gap-1.5">
            <DateFilter label="Desde" value={filterFechaDesde} onChange={setFilterFechaDesde} />
            <span className="text-xs text-muted-foreground">—</span>
            <DateFilter label="Hasta" value={filterFechaHasta} onChange={setFilterFechaHasta} />
          </div>
        </div>
      </div>
    );
  };
  
  export default ResumenFilters;