'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Mail, Phone, Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CreateLeadDialog } from '@/components/dashboard/create-lead-dialog';
import { EditLeadDialog } from '@/components/dashboard/edit-lead-dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  interest_product_id: string | null;
  contact_channel: string;
  created_at: string;
  products: { name: string } | null;
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [leads, searchTerm, channelFilter]);

  async function loadLeads() {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*, products(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteLead(id: string) {
    if (!confirm('¿Estás seguro de que quieres eliminar este lead?')) return;

    try {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
      loadLeads();
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('Error al eliminar el lead');
    }
  }

  function filterLeads() {
    let filtered = [...leads];

    if (searchTerm) {
      filtered = filtered.filter(
        (lead) =>
          lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.phone?.includes(searchTerm) ||
          lead.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (channelFilter !== 'all') {
      filtered = filtered.filter((lead) => lead.contact_channel === channelFilter);
    }

    setFilteredLeads(filtered);
  }

  const channelCounts = leads.reduce((acc, lead) => {
    acc[lead.contact_channel] = (acc[lead.contact_channel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return <div>Cargando leads...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads (CRM)</h1>
          <p className="text-slate-500 mt-1">
            Gestiona tus leads y contactos potenciales
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Lead
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Con Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leads.filter((l) => l.email).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Con Teléfono</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leads.filter((l) => l.phone).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                leads.filter(
                  (l) =>
                    new Date(l.created_at) >
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Buscar por nombre, email, teléfono o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">Todos los canales</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="web">Web</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm font-medium text-slate-500">
                  <th className="pb-3 pr-4">Nombre</th>
                  <th className="pb-3 pr-4">Contacto</th>
                  <th className="pb-3 pr-4">Producto de Interés</th>
                  <th className="pb-3 pr-4">Canal</th>
                  <th className="pb-3 pr-4">Fecha</th>
                  <th className="pb-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No se encontraron leads
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-xs text-slate-500">ID: {lead.id.slice(0, 8)}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center gap-1 text-xs">
                              <Mail className="h-3 w-3 text-slate-400" />
                              {lead.email}
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-1 text-xs">
                              <Phone className="h-3 w-3 text-slate-400" />
                              {lead.phone}
                            </div>
                          )}
                          {!lead.email && !lead.phone && (
                            <span className="text-xs text-slate-400">Sin contacto</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        {lead.products?.name || (
                          <span className="text-slate-400">No especificado</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize">
                          {lead.contact_channel}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-500">
                        {format(new Date(lead.created_at), "d 'de' MMM, yyyy", {
                          locale: es,
                        })}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingLead(lead);
                              setShowEditDialog(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 text-slate-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteLead(lead.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <CreateLeadDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={loadLeads}
      />

      <EditLeadDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={loadLeads}
        lead={editingLead}
      />
    </div>
  );
}
