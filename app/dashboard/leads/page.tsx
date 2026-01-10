'use client';

import { useEffect, useState, useCallback } from 'react';
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

  const loadLeads = useCallback(async () => {
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
  }, []);

  const filterLeads = useCallback(() => {
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
  }, [leads, searchTerm, channelFilter]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    filterLeads();
  }, [filterLeads]);

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
              className="h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
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
          <div className="space-y-4">
            {filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No se encontraron leads
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredLeads.map((lead) => (
                  <Card key={lead.id} className="overflow-hidden">
                    <CardHeader className="pb-3 bg-slate-50/50 border-b">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base font-semibold">
                            {lead.name}
                          </CardTitle>
                          <p className="text-xs text-slate-500 mt-1">
                            ID: {lead.id.slice(0, 8)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-900"
                            onClick={() => {
                              setEditingLead(lead);
                              setShowEditDialog(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteLead(lead.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      {lead.email && (
                        <div className="flex items-center text-sm text-slate-600">
                          <Mail className="mr-2 h-4 w-4 text-slate-400" />
                          <a href={`mailto:${lead.email}`} className="hover:underline">
                            {lead.email}
                          </a>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center text-sm text-slate-600">
                          <Phone className="mr-2 h-4 w-4 text-slate-400" />
                          <a href={`tel:${lead.phone}`} className="hover:underline">
                            {lead.phone}
                          </a>
                        </div>
                      )}
                      <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t mt-3">
                        <div className="flex items-center gap-2">
                          <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100 border font-medium">
                            {lead.contact_channel}
                          </span>
                          {lead.products && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium truncate max-w-[120px]">
                              {lead.products.name}
                            </span>
                          )}
                        </div>
                        <span>{format(new Date(lead.created_at), 'PP', { locale: es })}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <CreateLeadDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={loadLeads}
      />

      {editingLead && (
        <EditLeadDialog
          lead={editingLead}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSuccess={loadLeads}
        />
      )}
    </div>
  );
}
