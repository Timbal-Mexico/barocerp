'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

type Product = {
  id: string;
  name: string;
  sku: string;
};

type Warehouse = {
  id: string;
  name: string;
};

type ProductWarehouse = {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  warehouse_name?: string;
};

export function InventoryMovementDialog({ open, onOpenChange, onSuccess }: Props) {
  const [activeTab, setActiveTab] = useState('adjustment'); // adjustment | transfer
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [productWarehouses, setProductWarehouses] = useState<ProductWarehouse[]>([]);
  
  // Form states
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [adjustmentDirection, setAdjustmentDirection] = useState<'in' | 'out'>('in');

  // Derived state
  const currentStock = productWarehouses.find(
    pw => pw.product_id === selectedProductId && pw.warehouse_id === selectedWarehouseId
  )?.quantity || 0;

  useEffect(() => {
    if (open) {
      loadInitialData();
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (selectedProductId) {
      loadProductWarehouses(selectedProductId);
    }
  }, [selectedProductId]);

  async function loadInitialData() {
    try {
      const [{ data: productsData }, { data: warehousesData }] = await Promise.all([
        supabase.from('products').select('id, name, sku').eq('active', true).order('name'),
        supabase.from('warehouses').select('id, name').order('name'),
      ]);

      setProducts(productsData || []);
      setWarehouses(warehousesData || []);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }

  async function loadProductWarehouses(productId: string) {
    try {
      const { data } = await supabase
        .from('product_warehouses')
        .select('*')
        .eq('product_id', productId);
      
      setProductWarehouses(data || []);
    } catch (error) {
      console.error('Error loading product stock:', error);
    }
  }

  function resetForm() {
    setSelectedProductId('');
    setSelectedWarehouseId('');
    setTargetWarehouseId('');
    setQuantity('');
    setReason('');
    setNotes('');
    setAdjustmentDirection('in');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert('Debes iniciar sesión para registrar movimientos de inventario.');
        setLoading(false);
        return;
      }
      if (!selectedProductId) {
        throw new Error('Selecciona un producto');
      }
      const qty = parseInt(quantity);
      if (isNaN(qty) || qty <= 0) throw new Error('La cantidad debe ser mayor a 0');

      if (activeTab === 'adjustment') {
        if (!selectedWarehouseId) throw new Error('Selecciona un almacén');
        
        // Find or create product_warehouse entry
        let pwId = productWarehouses.find(
          pw => pw.product_id === selectedProductId && pw.warehouse_id === selectedWarehouseId
        )?.id;

        if (!pwId) {
          // If relationship doesn't exist, create it (with 0 stock initially)
          const { data: newPw, error: createError } = await supabase
            .from('product_warehouses')
            .insert({
              product_id: selectedProductId,
              warehouse_id: selectedWarehouseId,
              quantity: 0
            })
            .select()
            .single();

          if (createError) throw createError;
          pwId = newPw.id;
        }

        const sign = adjustmentDirection === 'out' ? -1 : 1;
        const adjustmentQty = sign * qty;

        const { error } = await supabase.from('inventory_adjustments').insert({
          product_warehouse_id: pwId,
          adjustment_quantity: adjustmentQty,
          reason: reason,
          notes: notes,
          created_by: user.id,
        });

        if (error) throw error;

      } else { // Transfer
        if (!selectedProductId) throw new Error('Selecciona un producto');
        if (!selectedWarehouseId || !targetWarehouseId) throw new Error('Selecciona almacenes de origen y destino');
        if (selectedWarehouseId === targetWarehouseId) throw new Error('Los almacenes deben ser diferentes');

        const sourcePw = productWarehouses.find(
          pw => pw.product_id === selectedProductId && pw.warehouse_id === selectedWarehouseId
        );
        
        // Target might not exist
        let targetPwId = productWarehouses.find(
          pw => pw.product_id === selectedProductId && pw.warehouse_id === targetWarehouseId
        )?.id;

        if (!targetPwId) {
           const { data: newPw, error: createError } = await supabase
            .from('product_warehouses')
            .insert({
              product_id: selectedProductId,
              warehouse_id: targetWarehouseId,
              quantity: 0
            })
            .select()
            .single();
            
            if (createError) throw createError;
            targetPwId = newPw.id;
        }
        if (!targetPwId) throw new Error('No se pudo crear relación destino');

        if (!sourcePw) throw new Error('El producto no existe en el almacén de origen');
        if (sourcePw.quantity < qty) throw new Error('Stock insuficiente en origen');

        const { error } = await supabase
          .from('inventory_transfers')
          .insert({
          from_product_warehouse_id: sourcePw.id,
          to_product_warehouse_id: targetPwId,
          quantity: qty,
          reason: reason,
          status: 'completed', // Auto-complete for now
          created_by: user.id
        });

        if (error) throw error;
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error submitting movement:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nuevo Movimiento de Inventario</DialogTitle>
          <DialogDescription>
            Registra ajustes o transferencias entre almacenes
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="adjustment">Ajuste Manual</TabsTrigger>
            <TabsTrigger value="transfer">Transferencia</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Producto</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Almacén {activeTab === 'transfer' ? 'Origen' : ''}</Label>
              <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar almacén" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProductId && selectedWarehouseId && (
                <p className="text-xs text-muted-foreground">
                  Stock actual: {currentStock}
                </p>
              )}
            </div>

            {activeTab === 'transfer' && (
              <div className="space-y-2">
                <Label>Almacén Destino</Label>
                <Select value={targetWarehouseId} onValueChange={setTargetWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar almacén" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses
                      .filter(w => w.id !== selectedWarehouseId)
                      .map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={adjustmentDirection}
                  onValueChange={(v: 'in' | 'out') => setAdjustmentDirection(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Entrada (+)</SelectItem>
                    <SelectItem value="out">Salida (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeTab === 'adjustment' ? (
                      <>
                        <SelectItem value="purchase">Compra</SelectItem>
                        <SelectItem value="return">Devolución</SelectItem>
                        <SelectItem value="manual_adjustment">Ajuste Manual</SelectItem>
                        <SelectItem value="damage">Daño</SelectItem>
                        <SelectItem value="loss">Pérdida</SelectItem>
                        <SelectItem value="other_adjustment">Otro</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="restock">Reabastecimiento</SelectItem>
                        <SelectItem value="order">Pedido</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                  {activeTab === 'adjustment' && reason && (
                    <p className="text-xs text-muted-foreground">
                      {adjustmentDirection === 'in'
                        ? 'Este ajuste SUMA stock en el almacén.'
                        : 'Este ajuste RESTA stock del almacén.'}
                    </p>
                  )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalles adicionales..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Procesando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
