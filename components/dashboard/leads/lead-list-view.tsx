
'use client';

import { useState, useMemo } from 'react';
import { LeadsToolbar } from './leads-toolbar';
import { LeadsTable } from './leads-table';
import { LeadsCardGrid } from './leads-card-grid';
import { LeadsExcelView } from './leads-excel-view';
import { RowSelectionState } from '@tanstack/react-table';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

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

interface LeadListViewProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
}

export function LeadListView({ leads, onEdit, onDelete }: LeadListViewProps) {
  const [viewMode, setViewMode] = useState<'list' | 'card' | 'excel'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Filter logic
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch = 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone?.includes(searchTerm) ||
        lead.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesChannel = channelFilter === 'all' || lead.contact_channel === channelFilter;
      
      let matchesDate = true;
      if (dateFilter) {
        const leadDate = new Date(lead.created_at);
        matchesDate = 
          leadDate.getDate() === dateFilter.getDate() &&
          leadDate.getMonth() === dateFilter.getMonth() &&
          leadDate.getFullYear() === dateFilter.getFullYear();
      }

      return matchesSearch && matchesChannel && matchesDate;
    });
  }, [leads, searchTerm, channelFilter, dateFilter]);

  // Derived selection for non-table views
  const selectedIds = Object.keys(rowSelection);

  const handleToggleSelection = (id: string, selected: boolean) => {
    setRowSelection(prev => {
      const newSelection = { ...prev };
      if (selected) {
        newSelection[id] = true;
      } else {
        delete newSelection[id];
      }
      return newSelection;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const newSelection: RowSelectionState = {};
      filteredLeads.forEach(lead => {
        newSelection[lead.id] = true;
      });
      setRowSelection(newSelection);
    } else {
      setRowSelection({});
    }
  };

  // Export Logic
  const handleExport = (formatType: 'excel' | 'csv' | 'pdf') => {
    const leadsToExport = selectedIds.length > 0 
      ? filteredLeads.filter(l => selectedIds.includes(l.id))
      : filteredLeads;

    const exportData = leadsToExport.map(lead => ({
      ID: lead.id,
      Nombre: lead.name,
      Email: lead.email || '',
      Teléfono: lead.phone || '',
      Canal: lead.contact_channel,
      'Producto Interés': lead.products?.name || '',
      'Fecha Creación': format(new Date(lead.created_at), 'yyyy-MM-dd HH:mm:ss')
    }));

    if (formatType === 'excel') {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leads");
      XLSX.writeFile(wb, "leads_export.xlsx");
    } else if (formatType === 'csv') {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "leads_export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (formatType === 'pdf') {
      const doc = new jsPDF();
      doc.text("Reporte de Leads", 14, 10);
      
      const tableColumn = ["Nombre", "Email", "Teléfono", "Canal", "Fecha"];
      const tableRows = leadsToExport.map(lead => [
        lead.name,
        lead.email || '-',
        lead.phone || '-',
        lead.contact_channel,
        format(new Date(lead.created_at), 'dd/MM/yyyy')
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
      });

      doc.save("leads_export.pdf");
    }
  };

  return (
    <div className="space-y-6">
      <LeadsToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        channelFilter={channelFilter}
        onChannelFilterChange={setChannelFilter}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        onExport={handleExport}
        selectedCount={selectedIds.length}
      />

      <div className="bg-white rounded-lg border shadow-sm min-h-[400px]">
        {viewMode === 'list' && (
          <div className="p-4">
            <LeadsTable
              data={filteredLeads}
              onEdit={onEdit}
              onDelete={onDelete}
              rowSelection={rowSelection}
              setRowSelection={setRowSelection}
            />
          </div>
        )}

        {viewMode === 'card' && (
          <div className="p-4">
            <LeadsCardGrid
              data={filteredLeads}
              onEdit={onEdit}
              onDelete={onDelete}
              selectedIds={selectedIds}
              onToggleSelection={handleToggleSelection}
            />
          </div>
        )}

        {viewMode === 'excel' && (
          <div className="p-0">
            <LeadsExcelView
              data={filteredLeads}
              selectedIds={selectedIds}
              onToggleSelection={handleToggleSelection}
              onSelectAll={handleSelectAll}
            />
          </div>
        )}
      </div>
      
      <div className="text-sm text-slate-500 text-right">
        Mostrando {filteredLeads.length} de {leads.length} leads
      </div>
    </div>
  );
}
