'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CreateSaleDialog } from '@/components/dashboard/create-sale-dialog';
import { EditSaleDialog } from '@/components/dashboard/edit-sale-dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Sale = {
  id: string;
  order_number: string;
  lead_id: string | null;
  channel: string;
  total_amount: number;
  created_at: string;
  leads: { name: string } | null;
};

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    filterSales();
  }, [sales, searchTerm, channelFilter]);

  async function loadSales() {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*, leads(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSale(id: string) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta venta? Esto restaurará el inventario.')) return;

    try {
      const { error } = await supabase.from('sales').delete().eq('id', id);
      if (error) throw error;
      loadSales();
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert('Error al eliminar la venta');
    }
  }

  function filterSales() {
    let filtered = [...sales];

    if (searchTerm) {
      filtered = filtered.filter(
        (sale) =>
          sale.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sale.leads?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (channelFilter !== 'all') {
      filtered = filtered.filter((sale) => sale.channel === channelFilter);
    }

    setFilteredSales(filtered);
  }

  const totalSales = filteredSales.reduce(
    (sum, sale) => sum + Number(sale.total_amount),
    0
  );

  if (loading) {
    return <div>Cargando ventas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
          <p className="text-slate-500 mt-1">
            Gestiona y visualiza todas las ventas
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Venta
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSales.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Ingresos Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSales.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${filteredSales.length > 0 ? (totalSales / filteredSales.length).toFixed(2) : '0.00'}
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
                placeholder="Buscar por número de orden o lead..."
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
              <option value="organico">Orgánico</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm font-medium text-slate-500">
                  <th className="pb-3 pr-4">Número de Orden</th>
                  <th className="pb-3 pr-4">Lead</th>
                  <th className="pb-3 pr-4">Canal</th>
                  <th className="pb-3 pr-4 text-right">Monto</th>
                  <th className="pb-3 pr-4">Fecha</th>
                  <th className="pb-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No se encontraron ventas
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 pr-4 font-medium">
                        {sale.order_number}
                      </td>
                      <td className="py-3 pr-4">
                        {sale.leads?.name || 'Sin lead'}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize">
                          {sale.channel}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right font-medium">
                        ${Number(sale.total_amount).toFixed(2)}
                      </td>
                      <td className="py-3 pr-4 text-slate-500">
                        {format(new Date(sale.created_at), "d 'de' MMM, yyyy", {
                          locale: es,
                        })}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingSale(sale);
                              setShowEditDialog(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 text-slate-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteSale(sale.id)}
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

      <CreateSaleDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={loadSales}
      />

      <EditSaleDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={loadSales}
        sale={editingSale}
      />
    </div>
  );
}
