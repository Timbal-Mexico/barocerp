'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Eye, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { SyncStatus } from '@/components/ui/sync-status';

type Warehouse = {
  id: string;
  name: string;
  location: string | null;
  created_at: string;
};

type WarehouseSummary = {
  warehouse_id: string;
  warehouse_name: string;
  product_count: number;
  total_stock: number;
  total_available: number;
};

type WarehouseWithSummary = Warehouse & {
  product_count: number;
  total_stock: number;
  total_available: number;
};

type WarehouseStockRow = {
  id: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  last_updated_at: string | null;
  products: {
    id: string;
    name: string;
    sku: string;
    price: number;
    active: boolean;
  } | null;
};

export function WarehouseList() {
  const [warehouses, setWarehouses] = useState<WarehouseWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // New warehouse form state
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseWithSummary | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [showStockDialog, setShowStockDialog] = useState(false);
  const [stockWarehouse, setStockWarehouse] = useState<WarehouseWithSummary | null>(null);
  const [stockRows, setStockRows] = useState<WarehouseStockRow[]>([]);
  const [stockLoading, setStockLoading] = useState(false);

  useEffect(() => {
    loadWarehouses();
    const channel = supabase
      .channel('inventory-warehouses-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_warehouses' },
        () => {
          loadWarehouses();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_adjustments' },
        () => {
          loadWarehouses();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_transfers' },
        () => {
          loadWarehouses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadWarehouses() {
    try {
      console.debug('warehouses-load-start');
      const [{ data: warehouseData, error: warehouseError }, { data: summaryData, error: summaryError }] =
        await Promise.all([
          supabase.from('warehouses').select('*').order('created_at', { ascending: false }),
          supabase.from('warehouse_stock_summary').select('*'),
        ]);

      if (warehouseError) throw warehouseError;
      if (summaryError) throw summaryError;

      const summaryById = new Map<string, WarehouseSummary>();
      (summaryData || []).forEach((s: any) => {
        summaryById.set(s.warehouse_id, {
          warehouse_id: s.warehouse_id,
          warehouse_name: s.warehouse_name,
          product_count: Number(s.product_count || 0),
          total_stock: Number(s.total_stock || 0),
          total_available: Number(s.total_available || 0),
        });
      });

      const merged = (warehouseData || []).map((w: any) => {
        const summary = summaryById.get(w.id);
        return {
          id: w.id,
          name: w.name,
          location: w.location,
          created_at: w.created_at,
          product_count: summary?.product_count ?? 0,
          total_stock: summary?.total_stock ?? 0,
          total_available: summary?.total_available ?? 0,
        } satisfies WarehouseWithSummary;
      });

      setWarehouses(merged);
      const maxDate =
        merged
          .map((w) => w.created_at)
          .filter(Boolean)
          .map((d) => new Date(d as string).getTime())
          .reduce((a, b) => Math.max(a, b), 0) || Date.now();
      setLastUpdated(new Date(maxDate));
      console.debug('warehouses-load-success', { count: merged.length });
    } catch (error) {
      console.error('Error loading warehouses:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('warehouses')
        .insert([{ name: newName, location: newLocation }]);

      if (error) throw error;

      setShowCreateDialog(false);
      setNewName('');
      setNewLocation('');
      loadWarehouses();
    } catch (error: any) {
      alert('Error creating warehouse: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEdit(warehouse: WarehouseWithSummary) {
    setEditingWarehouse(warehouse);
    setEditName(warehouse.name);
    setEditLocation(warehouse.location || '');
    setShowEditDialog(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingWarehouse) return;
    setIsEditing(true);

    try {
      const { error } = await supabase
        .from('warehouses')
        .update({
          name: editName,
          location: editLocation ? editLocation : null,
        })
        .eq('id', editingWarehouse.id);

      if (error) throw error;
      setShowEditDialog(false);
      setEditingWarehouse(null);
      loadWarehouses();
    } catch (error: any) {
      alert('Error updating warehouse: ' + error.message);
    } finally {
      setIsEditing(false);
    }
  }

  async function loadWarehouseStock(warehouseId: string) {
    setStockLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_warehouses')
        .select(
          'id, quantity, reserved_quantity, available_quantity, last_updated_at, products(id, name, sku, price, active)'
        )
        .eq('warehouse_id', warehouseId);

      if (error) throw error;

      const rows = (data || []) as unknown as WarehouseStockRow[];
      rows.sort((a, b) => {
        const an = a.products?.name || '';
        const bn = b.products?.name || '';
        return an.localeCompare(bn, 'es');
      });
      setStockRows(rows);
    } catch (error: any) {
      toast.error('Error al cargar stock del almacén: ' + error.message);
      setStockRows([]);
    } finally {
      setStockLoading(false);
    }
  }

  async function openStock(warehouse: WarehouseWithSummary) {
    setStockWarehouse(warehouse);
    setShowStockDialog(true);
    await loadWarehouseStock(warehouse.id);
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este almacén?')) return;

    try {
      const { error } = await supabase.from('warehouses').delete().eq('id', id);
      if (error) throw error;
      loadWarehouses();
    } catch (error: any) {
      alert('Error deleting warehouse: ' + error.message);
    }
  }

  if (loading) return <div>Cargando almacenes...</div>;

  return (
    <div className="space-y-4">
      <SyncStatus loading={loading} lastUpdated={lastUpdated} onRefresh={loadWarehouses} />
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Almacenes</h2>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Almacén
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Almacén</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Almacén Central"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Ubicación</Label>
                <Input
                  id="location"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Ej. Ciudad de México"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creando...' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Almacén</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Ubicación</Label>
              <Input
                id="edit-location"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingWarehouse(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isEditing}>
                {isEditing ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showStockDialog}
        onOpenChange={(open) => {
          setShowStockDialog(open);
          if (!open) {
            setStockWarehouse(null);
            setStockRows([]);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Stock por Almacén</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              {stockWarehouse ? `${stockWarehouse.name} · ${stockWarehouse.location || 'Sin ubicación'}` : ''}
            </div>
            {stockLoading ? (
              <div className="py-6 text-sm text-slate-500">Cargando stock...</div>
            ) : stockRows.length === 0 ? (
              <div className="py-6 text-sm text-slate-500">No hay productos en este almacén.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-sm font-medium text-slate-500">
                      <th className="pb-3 pr-4">Producto</th>
                      <th className="pb-3 pr-4">SKU</th>
                      <th className="pb-3 pr-4 text-right">Stock</th>
                      <th className="pb-3 pr-4 text-right">Reservado</th>
                      <th className="pb-3 pr-4 text-right">Disponible</th>
                      <th className="pb-3 pr-4">Últ. Mod.</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {stockRows.map((row) => (
                      <tr key={row.id} className="border-b hover:bg-slate-50">
                        <td className="py-3 pr-4 font-medium">{row.products?.name || 'Producto'}</td>
                        <td className="py-3 pr-4 font-mono text-xs">{row.products?.sku || '-'}</td>
                        <td className="py-3 pr-4 text-right">{row.quantity}</td>
                        <td className="py-3 pr-4 text-right">{row.reserved_quantity}</td>
                        <td className="py-3 pr-4 text-right">{row.available_quantity}</td>
                        <td className="py-3 pr-4 text-sm text-slate-500">
                          {row.last_updated_at
                            ? new Date(row.last_updated_at).toLocaleDateString('es-ES')
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowStockDialog(false);
                setStockWarehouse(null);
                setStockRows([]);
              }}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-3">
        {warehouses.map((warehouse) => (
          <Card key={warehouse.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {warehouse.name}
              </CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mt-1">
                {warehouse.location || 'Sin ubicación'}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-md border p-2">
                  <div className="text-muted-foreground">Productos</div>
                  <div className="font-medium text-slate-900">{warehouse.product_count}</div>
                </div>
                <div className="rounded-md border p-2">
                  <div className="text-muted-foreground">Stock</div>
                  <div className="font-medium text-slate-900">{warehouse.total_stock}</div>
                </div>
                <div className="rounded-md border p-2">
                  <div className="text-muted-foreground">Disponible</div>
                  <div className="font-medium text-slate-900">{warehouse.total_available}</div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openStock(warehouse)}
                  title="Ver stock"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(warehouse)}
                  title="Editar almacén"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(warehouse.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
