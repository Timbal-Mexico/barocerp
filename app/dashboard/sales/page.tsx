'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Pencil, Trash2, Eye, FileCheck2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CreateSaleDialog } from '@/components/dashboard/create-sale-dialog';
import { EditSaleDialog } from '@/components/dashboard/edit-sale-dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SyncStatus } from '@/components/ui/sync-status';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Sale = {
  id: string;
  order_number: string;
  lead_id: string | null;
  channel: string;
  total_amount: number;
  created_at: string;
  leads: { name: string; email: string | null; phone: string | null } | null;
};

type SaleItemDetail = {
  id: string;
  quantity: number;
  price: number;
  products: { id: string; name: string; sku: string; image_url: string | null } | null;
};

export default function SalesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [detailItems, setDetailItems] = useState<SaleItemDetail[]>([]);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadSales = useCallback(async () => {
    try {
      console.debug('sales-load-start');
      const { data, error } = await supabase
        .from('sales')
        .select('*, leads!sales_lead_id_fkey(name, email, phone)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
      const maxDate =
        (data || [])
          .map((s: any) => s.created_at)
          .filter(Boolean)
          .map((d: string) => new Date(d).getTime())
          .reduce((a, b) => Math.max(a, b), 0) || Date.now();
      setLastUpdated(new Date(maxDate));
      console.debug('sales-load-success', { count: (data || []).length });
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSale = useCallback(async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta venta? Esto restaurará el inventario.')) return;

    try {
      const { error } = await supabase.from('sales').delete().eq('id', id);
      if (error) throw error;
      loadSales();
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert('Error al eliminar la venta');
    }
  }, [loadSales]);

  const loadSaleDetails = useCallback(async (sale: Sale) => {
    try {
      setDetailLoading(true);
      setDetailSale(sale);
      setShowDetailDialog(true);
      const { data, error } = await supabase
        .from('sale_items')
        .select('id, quantity, price, products:product_id (id, name, sku, image_url)')
        .eq('sale_id', sale.id);
      if (error) throw error;
      setDetailItems((data as any) || []);
    } catch (error) {
      console.error('Error loading sale items:', error);
      alert('Error al cargar detalle de la venta');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const filterSales = useCallback(() => {
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
  }, [sales, searchTerm, channelFilter]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  useEffect(() => {
    filterSales();
  }, [filterSales]);

  const totalSales = filteredSales.reduce(
    (sum, sale) => sum + Number(sale.total_amount),
    0
  );

  const detailSubtotal =
    detailItems.length > 0
      ? detailItems.reduce(
          (sum, item) => sum + item.quantity * Number(item.price),
          0
        )
      : detailSale
      ? Number(detailSale.total_amount)
      : 0;
  const detailTax = detailSubtotal * 0.16;
  const detailTotal = detailSubtotal + detailTax;

  async function handleGenerateInvoice() {
    if (!detailSale) return;
    const params = new URLSearchParams();
    params.set('saleId', detailSale.id);
    if (detailSale.leads?.name) {
      params.set('billingName', detailSale.leads.name);
    }
    router.push(`/dashboard/invoices?${params.toString()}`);
  }

  if (loading) {
    return <div>Cargando ventas...</div>;
  }

  return (
    <div className="space-y-6">
      <SyncStatus loading={loading} lastUpdated={lastUpdated} onRefresh={loadSales} />
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
                            onClick={() => loadSaleDetails(sale)}
                          >
                            <Eye className="h-4 w-4 text-slate-500" />
                          </Button>
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

      <Dialog
        open={showDetailDialog}
        onOpenChange={(open) => {
          setShowDetailDialog(open);
          if (!open) {
            setDetailSale(null);
            setDetailItems([]);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle de venta</DialogTitle>
            <DialogDescription>
              Resumen de la transacción y productos vendidos.
            </DialogDescription>
          </DialogHeader>

          {detailSale && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="md:w-1/3 flex items-center justify-center">
                  {detailItems[0]?.products?.image_url ? (
                    <div className="relative h-32 w-32 overflow-hidden rounded-md bg-slate-100">
                      <Image
                        src={detailItems[0].products.image_url}
                        alt={detailItems[0].products.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-32 w-32 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 text-xs text-center p-2">
                      Imagen de producto no disponible
                    </div>
                  )}
                </div>
                <div className="md:w-2/3 space-y-1 text-sm">
                  <div className="font-medium">
                    Venta {detailSale.order_number}
                  </div>
                  <div className="text-slate-500">
                    Fecha:{' '}
                    {format(
                      new Date(detailSale.created_at),
                      "d 'de' MMM, yyyy",
                      { locale: es }
                    )}
                  </div>
                  <div className="mt-2">
                    <div className="text-xs uppercase text-slate-500">
                      Cliente
                    </div>
                    <div className="font-medium">
                      {detailSale.leads?.name || 'Sin datos de cliente'}
                    </div>
                    <div className="text-slate-500">
                      {detailSale.leads?.email || '-'}
                    </div>
                    <div className="text-slate-500">
                      {detailSale.leads?.phone || '-'}
                    </div>
                  </div>
                </div>
              </div>

              {detailLoading && detailItems.length === 0 && (
                <div className="py-4 text-center text-sm text-slate-500">
                  Cargando detalle de la venta...
                </div>
              )}

              {detailItems.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-xs md:text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-slate-500">
                        <th className="py-2 px-3">Producto</th>
                        <th className="py-2 px-3">SKU</th>
                        <th className="py-2 px-3 text-right">Cantidad</th>
                        <th className="py-2 px-3 text-right">Precio unitario</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailItems.map((item) => {
                        const lineTotal =
                          item.quantity * Number(item.price);
                        return (
                          <tr key={item.id} className="border-t">
                            <td className="py-2 px-3">
                              {item.products?.name || 'Producto'}
                            </td>
                            <td className="py-2 px-3">
                              {item.products?.sku || '-'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {item.quantity}
                            </td>
                            <td className="py-2 px-3 text-right">
                              ${Number(item.price).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right">
                              ${lineTotal.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="text-sm text-slate-500">
                  {detailItems.length} productos en esta venta.
                </div>
                <div className="space-y-1 text-right text-sm">
                  <div>Subtotal: ${detailSubtotal.toFixed(2)}</div>
                  <div>Impuestos (16%): ${detailTax.toFixed(2)}</div>
                  <div className="font-bold">
                    Total: ${detailTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleGenerateInvoice}
                  disabled={detailLoading || !detailSale}
                >
                  <FileCheck2 className="h-4 w-4 mr-2" />
                  Generar Factura
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
