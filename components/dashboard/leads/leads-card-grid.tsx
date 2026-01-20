
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2, Mail, Phone } from 'lucide-react';
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

interface LeadsCardGridProps {
  data: Lead[];
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  selectedIds: string[];
  onToggleSelection: (id: string, selected: boolean) => void;
}

export function LeadsCardGrid({ data, onEdit, onDelete, selectedIds, onToggleSelection }: LeadsCardGridProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed">
        No hay leads para mostrar
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.map((lead) => {
        const isSelected = selectedIds.includes(lead.id);
        
        return (
          <Card key={lead.id} className={`overflow-hidden transition-all ${isSelected ? 'ring-2 ring-slate-900 border-slate-900' : ''}`}>
            <CardHeader className="pb-3 bg-slate-50/50 border-b">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={(checked) => onToggleSelection(lead.id, !!checked)}
                    className="mt-1"
                  />
                  <div>
                    <CardTitle className="text-base font-semibold truncate max-w-[150px] sm:max-w-[200px]" title={lead.name}>
                      {lead.name}
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-1">
                      ID: {lead.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-slate-900"
                    onClick={() => onEdit(lead)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onDelete(lead.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {format(new Date(lead.created_at), 'dd MMM yyyy', { locale: es })}
                </span>
              </div>

              <div className="space-y-2">
                {lead.email ? (
                  <div className="flex items-center text-sm text-slate-600">
                    <Mail className="mr-2 h-4 w-4 text-slate-400 shrink-0" />
                    <a href={`mailto:${lead.email}`} className="hover:underline truncate block">
                      {lead.email}
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center text-sm text-slate-400 italic">
                    <Mail className="mr-2 h-4 w-4 shrink-0" /> Sin email
                  </div>
                )}
                
                {lead.phone ? (
                  <div className="flex items-center text-sm text-slate-600">
                    <Phone className="mr-2 h-4 w-4 text-slate-400 shrink-0" />
                    <a href={`tel:${lead.phone}`} className="hover:underline">
                      {lead.phone}
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center text-sm text-slate-400 italic">
                    <Phone className="mr-2 h-4 w-4 shrink-0" /> Sin teléfono
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center gap-2 text-xs text-slate-500 border-t mt-3">
                <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100 border font-medium">
                  {lead.contact_channel}
                </span>
                {lead.products && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium truncate flex-1">
                    {lead.products.name}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
