'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

type Warehouse = {
  id: string;
  name: string;
};

export function CreateProductDialog({ open, onOpenChange, onSuccess }: Props) {
  const [dbCheckLoading, setDbCheckLoading] = useState(false);
  const [dbCounts, setDbCounts] = useState<{ sales: number; products: number; warehouses: number; leads: number } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    stock: '',
    brand: '',
    client: '',
    active: true,
    warehouse_id: '',
    initial_stock_reason: 'initial_stock',
  });
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    if (open) {
      verifyDatabaseState();
      setFormData({
        name: '',
        sku: '',
        price: '',
        stock: '',
        brand: '',
        client: '',
        active: true,
        warehouse_id: '',
        initial_stock_reason: 'initial_stock',
      });
    }
  }, [open]);

  async function verifyDatabaseState() {
    try {
      setDbCheckLoading(true);
      const [salesRes, productsRes, warehousesRes, leadsRes] = await Promise.all([
        supabase.from('sales').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('warehouses').select('id', { count: 'exact', head: true }),
        supabase.from('leads').select('id', { count: 'exact', head: true }),
      ]);
      const counts = {
        sales: salesRes.count ?? 0,
        products: productsRes.count ?? 0,
        warehouses: warehousesRes.count ?? 0,
        leads: leadsRes.count ?? 0,
      };
      console.info('DB counts:', counts);
      setDbCounts(counts);
    } catch (error) {
      console.error('Error verifying DB state:', error);
    } finally {
      setDbCheckLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    loadWarehouses();
  }, [open]);

  async function loadWarehouses() {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWarehouses((data || []) as Warehouse[]);
    } catch (error: any) {
      toast.error('Error cargando almacenes: ' + error.message);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (dbCounts && dbCounts.warehouses === 0) {
        toast.error('Primero crea un almacén antes de agregar productos');
        setLoading(false);
        return;
      }
      if (!formData.warehouse_id) {
        toast.error('Por favor selecciona un almacén');
        setLoading(false);
        return;
      }

      const { data: productData, error: productError } = await supabase
        .from('products')
        .insert({
          name: formData.name,
          sku: formData.sku,
          price: parseFloat(formData.price),
          brand: formData.brand || null,
          client: formData.client || null,
          active: formData.active,
        })
        .select('id')
        .single();

      if (productError) throw productError;

      // Optional image upload (max 5MB)
      if (imageFile) {
        if (imageFile.size > 5 * 1024 * 1024) {
          throw new Error('La imagen supera el límite de 5MB');
        }
        const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${productData.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('erpcommerce').upload(path, imageFile, {
          upsert: true,
        });
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from('erpcommerce').getPublicUrl(path);

        // Update product with image URL
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_url: publicUrl.publicUrl })
          .eq('id', productData.id);

        if (updateError) throw updateError;
      }

      const initialStock = parseInt(formData.stock) || 0;
      if (initialStock < 0) {
        toast.error('El stock inicial no puede ser negativo');
        setLoading(false);
        return;
      }

      const { data: productWarehouseData, error: productWarehouseError } = await supabase
        .from('product_warehouses')
        .upsert(
          {
            product_id: productData.id,
            warehouse_id: formData.warehouse_id,
            quantity: initialStock,
          },
          { onConflict: 'product_id,warehouse_id' }
        )
        .select('id')
        .single();

      if (productWarehouseError) throw productWarehouseError;

      if (initialStock > 0) {
        const { error: adjustmentError } = await supabase
          .from('inventory_adjustments')
          .insert({
            product_warehouse_id: productWarehouseData.id,
            adjustment_quantity: initialStock,
            reason: formData.initial_stock_reason,
            notes: 'Stock inicial al crear producto',
          });

        if (adjustmentError) throw adjustmentError;
      }

      onSuccess();
      onOpenChange(false);
      toast.success('Producto creado exitosamente');
    } catch (error: any) {
      const msg = String(error?.message || '');
      console.error('Error creating product:', error);
      if (msg.includes('row-level security')) {
        toast.error('No tienes permisos para crear el producto. Contacta al administrador.');
      } else {
        toast.error('Error al crear el producto: ' + msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Producto</DialogTitle>
          <DialogDescription>
            Agrega un nuevo producto al inventario
          </DialogDescription>
        </DialogHeader>

        {dbCheckLoading && <div className="text-sm text-slate-500">Verificando base de datos...</div>}
        {dbCounts && (dbCounts.sales === 0 && dbCounts.products === 0 && dbCounts.warehouses === 0 && dbCounts.leads === 0) ? (
          <div className="mb-2 text-sm text-slate-600">
            No se encontraron registros iniciales. Completa el formulario para crear tu primer producto.
          </div>
        ) : (
          <div className="mb-2 text-xs text-slate-500">
            Datos existentes detectados. Continúa si necesitas agregar más productos.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del producto *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU *</Label>
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) =>
                setFormData({ ...formData, sku: e.target.value })
              }
              placeholder="PROD-001"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) =>
                  setFormData({ ...formData, brand: e.target.value })
                }
                placeholder="Ej. Nike, Adidas, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Cliente</Label>
              <Input
                id="client"
                value={formData.client}
                onChange={(e) =>
                  setFormData({ ...formData, client: e.target.value })
                }
                placeholder="Ej. Cliente VIP"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Imagen del producto (opcional, máx 5MB)</Label>
            <div className="flex items-center gap-4">
              {previewUrl && (
                <div className="relative h-16 w-16 overflow-hidden rounded-md border">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                }}
                className="flex-1"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="warehouse">Almacén *</Label>
              <Select
                value={formData.warehouse_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, warehouse_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar almacén" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Stock inicial *</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) =>
                  setFormData({ ...formData, stock: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Precio *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value })
              }
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) =>
                setFormData({ ...formData, active: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300"
            />
            <Label htmlFor="active" className="cursor-pointer">
              Producto activo
            </Label>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creando...' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
