
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { CreateLeadDialog } from '@/components/dashboard/create-lead-dialog';
import { EditLeadDialog } from '@/components/dashboard/edit-lead-dialog';
import { LeadListView } from '@/components/dashboard/leads/lead-list-view';

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
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const loadLeads = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*, products(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data as unknown as Lead[] || []);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-500">
        <div className="animate-pulse">Cargando leads...</div>
      </div>
    );
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

      <div className="grid gap-4 md:grid-cols-2">
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

      <LeadListView 
        leads={leads}
        onEdit={(lead) => {
          setEditingLead(lead);
          setShowEditDialog(true);
        }}
        onDelete={deleteLead}
      />

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
