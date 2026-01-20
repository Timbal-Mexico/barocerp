
'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  LayoutGrid, 
  List, 
  Table as TableIcon, 
  Download, 
  FileSpreadsheet, 
  FileText,
  Filter,
  X
} from 'lucide-react';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface LeadsToolbarProps {
  viewMode: 'list' | 'card' | 'excel';
  onViewModeChange: (mode: 'list' | 'card' | 'excel') => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  channelFilter: string;
  onChannelFilterChange: (channel: string) => void;
  dateFilter: Date | undefined;
  onDateFilterChange: (date: Date | undefined) => void;
  onExport: (format: 'excel' | 'csv' | 'pdf') => void;
  selectedCount: number;
}

export function LeadsToolbar({
  viewMode,
  onViewModeChange,
  searchTerm,
  onSearchChange,
  channelFilter,
  onChannelFilterChange,
  dateFilter,
  onDateFilterChange,
  onExport,
  selectedCount
}: LeadsToolbarProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-1 w-full sm:w-auto gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar {selectedCount > 0 && `(${selectedCount})`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Formato de exportación</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onExport('excel')}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('csv')}>
                <FileText className="mr-2 h-4 w-4" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('pdf')}>
                <FileText className="mr-2 h-4 w-4" /> PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center border rounded-md bg-white">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-9 w-9 rounded-none border-r", viewMode === 'list' && "bg-slate-100")}
              onClick={() => onViewModeChange('list')}
              title="Vista Lista"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-9 w-9 rounded-none border-r", viewMode === 'card' && "bg-slate-100")}
              onClick={() => onViewModeChange('card')}
              title="Vista Tarjetas"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-9 w-9 rounded-none", viewMode === 'excel' && "bg-slate-100")}
              onClick={() => onViewModeChange('excel')}
              title="Vista Excel"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-lg border animate-in slide-in-from-top-2">
          <div className="space-y-2 min-w-[200px]">
            <Label>Canal</Label>
            <Select value={channelFilter} onValueChange={onChannelFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los canales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 flex flex-col">
            <Label>Fecha de creación</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !dateFilter && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateFilter ? format(dateFilter, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={onDateFilterChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-end pb-0.5">
            <Button 
              variant="ghost" 
              onClick={() => {
                onChannelFilterChange('all');
                onDateFilterChange(undefined);
                onSearchChange('');
              }}
            >
              <X className="mr-2 h-4 w-4" /> Limpiar filtros
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
