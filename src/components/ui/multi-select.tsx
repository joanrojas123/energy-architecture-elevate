import * as React from "react";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
  className?: string;
}

const MultiSelect = ({ options, selected, onChange, placeholder = "Todos", className }: MultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const toggle = (val: string) => {
    onChange(
      selected.includes(val)
        ? selected.filter(v => v !== val)
        : [...selected, val]
    );
  };

  const removeChip = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(v => v !== val));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-auto min-h-[32px] w-full justify-between text-xs font-normal px-2 py-1", className)}
        >
          <div className="flex flex-wrap gap-1 items-center flex-1 min-w-0">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : selected.length <= 2 ? (
              selected.map(v => (
                <Badge key={v} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-0.5 max-w-[120px] truncate">
                  {v}
                  <X className="h-2.5 w-2.5 shrink-0 cursor-pointer hover:text-foreground" onClick={(e) => removeChip(v, e)} />
                </Badge>
              ))
            ) : (
              <>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-0.5 max-w-[120px] truncate">
                  {selected[0]}
                  <X className="h-2.5 w-2.5 shrink-0 cursor-pointer hover:text-foreground" onClick={(e) => removeChip(selected[0], e)} />
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                  +{selected.length - 1}
                </Badge>
              </>
            )}
          </div>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <div className="p-2 border-b border-border">
          <Input
            placeholder="Buscar…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-7 text-xs"
          />
        </div>
        <div className="max-h-[200px] overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Sin resultados</p>
          ) : (
            filtered.map(opt => {
              const isSelected = selected.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => toggle(opt)}
                  className={cn(
                    "flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-xs text-left hover:bg-accent transition-colors",
                    isSelected && "bg-accent/50"
                  )}
                >
                  <div className={cn(
                    "h-3.5 w-3.5 rounded-sm border border-border flex items-center justify-center shrink-0",
                    isSelected && "bg-primary border-primary"
                  )}>
                    {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                  </div>
                  <span className="truncate">{opt}</span>
                </button>
              );
            })
          )}
        </div>
        {selected.length > 0 && (
          <div className="border-t border-border p-1">
            <button
              onClick={() => { onChange([]); }}
              className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-1.5 transition-colors"
            >
              Limpiar selección
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export { MultiSelect };
