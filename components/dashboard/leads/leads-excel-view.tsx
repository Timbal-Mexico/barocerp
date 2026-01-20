
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  interest_product_id: string | null;
  contact_channel: string;
  created_at: string;
  products: { name: string } | null;
}

interface LeadsExcelViewProps {
  data: Lead[];
  selectedIds: string[];
  onToggleSelection: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
}

export function LeadsExcelView({ data, selectedIds, onToggleSelection, onSelectAll }: LeadsExcelViewProps) {
  const allSelected = data.length > 0 && selectedIds.length === data.length;

  return (
    <div className="rounded-none border border-slate-300 overflow-x-auto bg-white">
      <Table className="w-full border-collapse">
        <TableHeader className="bg-slate-100">
          <TableRow className="hover:bg-slate-100">
            <TableHead className="w-[50px] border-r border-slate-300 text-center font-bold text-slate-700 h-8">
              <Checkbox 
                checked={allSelected}
                onCheckedChange={(checked) => onSelectAll(!!checked)}
              />
            </TableHead>
            <TableHead className="border-r border-slate-300 font-bold text-slate-700 h-8 min-w-[200px]">Nombre</TableHead>
            <TableHead className="border-r border-slate-300 font-bold text-slate-700 h-8 min-w-[100px]">Canal</TableHead>
            <TableHead className="border-r border-slate-300 font-bold text-slate-700 h-8 min-w-[200px]">Email</TableHead>
            <TableHead className="border-r border-slate-300 font-bold text-slate-700 h-8 min-w-[150px]">Teléfono</TableHead>
            <TableHead className="border-r border-slate-300 font-bold text-slate-700 h-8 min-w-[200px]">Producto Interés</TableHead>
            <TableHead className="font-bold text-slate-700 h-8 min-w-[150px]">Fecha Creación</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((lead, index) => (
            <TableRow key={lead.id} className="hover:bg-blue-50/50 border-b border-slate-200">
              <TableCell className="border-r border-slate-200 text-center py-1 h-8">
                <Checkbox 
                  checked={selectedIds.includes(lead.id)}
                  onCheckedChange={(checked) => onToggleSelection(lead.id, !!checked)}
                />
              </TableCell>
              <TableCell className="border-r border-slate-200 py-1 h-8">{lead.name}</TableCell>
              <TableCell className="border-r border-slate-200 py-1 h-8 capitalize">{lead.contact_channel}</TableCell>
              <TableCell className="border-r border-slate-200 py-1 h-8">{lead.email || '-'}</TableCell>
              <TableCell className="border-r border-slate-200 py-1 h-8">{lead.phone || '-'}</TableCell>
              <TableCell className="border-r border-slate-200 py-1 h-8">{lead.products?.name || '-'}</TableCell>
              <TableCell className="py-1 h-8">{format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}</TableCell>
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                No hay datos
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
