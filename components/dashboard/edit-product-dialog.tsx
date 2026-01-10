'use client';

import { useState, useEffect, useCallback } from 'react';
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

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  brand?: string;
  client?: string;
  active: boolean;
  quantity_sold?: number;
  last_updated_at?: string | null;
  warehouse_name?: string;
  warehouse_count?: number;
  image_url?: string | null;
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
  warehouse_name: string;
};

type Props = {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function EditProductDialog({ product, open, onOpenChange, onSuccess }: Props) {
  const [formData, setFormData] = useState({
    name: product.name,
    sku: product.sku,
    price: product.price.toString(),
    stock: product.stock.toString(),
    brand: product.brand || '',
    client: product.client || '',
    active: product.active,
    warehouse_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [productWarehouses, setProductWarehouses] = useState<ProductWarehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(product.image_url || null);
    }
  }, [imageFile, product.image_url]);

  const loadWarehouses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  }, []);

  const loadProductWarehouses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('product_warehouses')
        .select(`
          id,
          product_id,
          warehouse_id,
          quantity,
          warehouses(name)
        `)
        .eq('product_id', product.id);
      
      if (error) throw error;
      
      const transformedData = (data as any[])?.map((pw) => ({
        id: pw.id,
        product_id: pw.product_id,
        warehouse_id: pw.warehouse_id,
        quantity: pw.quantity,
        warehouse_name: Array.isArray(pw.warehouses) 
          ? pw.warehouses[0]?.name || '' 
          : pw.warehouses?.name || '',
      })) || [];
      
      setProductWarehouses(transformedData);
      
      if (transformedData.length > 0) {
        setSelectedWarehouseId(transformedData[0].warehouse_id);
        setCurrentStock(transformedData[0].quantity);
        setFormData(prev => ({ ...prev, warehouse_id: transformedData[0].warehouse_id }));
      }
    } catch (error) {
      console.error('Error loading product warehouses:', error);
    }
  }, [product.id]);

  useEffect(() => {
    setFormData({
      name: product.name,
      sku: product.sku,
      price: product.price.toString(),
      stock: product.stock.toString(),
      brand: product.brand || '',
      client: product.client || '',
      active: product.active,
      warehouse_id: '',
    });
    setImageFile(null);
    if (open) {
      loadWarehouses();
      loadProductWarehouses();
    }
  }, [product, open, loadWarehouses, loadProductWarehouses]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (!selectedWarehouseId) {
      toast.error('Por favor selecciona un almacén');
      setLoading(false);
      return;
    }

    try {
      // 1. Update product basic info
      const { error: productError } = await supabase
        .from('products')
        .update({
          name: formData.name,
          sku: formData.sku,
          price: parseFloat(formData.price),
          brand: formData.brand || null,
          client: formData.client || null,
          active: formData.active,
        })
        .eq('id', product.id);

      if (productError) throw productError;

      // Update image if new file selected
      if (imageFile) {
        if (imageFile.size > 5 * 1024 * 1024) {
          toast.error('La imagen no puede superar los 5MB');
        } else {
          const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
          const path = `${product.id}/${Date.now()}.${ext}`;
          
          const { error: uploadError } = await supabase.storage
            .from('erpcommerce')
            .upload(path, imageFile, { upsert: true });

          if (uploadError) {
             console.error('Error uploading image:', uploadError);
             toast.error('Error al subir la imagen');
          } else {
             const { data: publicUrl } = supabase.storage.from('erpcommerce').getPublicUrl(path);
             
             await supabase
               .from('products')
               .update({ image_url: publicUrl.publicUrl })
               .eq('id', product.id);
          }
        }
      }
      
      // Update stock in warehouse if selected
      if (selectedWarehouseId) {
        const newStock = parseInt(formData.stock) || 0;
        
        // Don't allow negative stock
        if (newStock < 0) {
           toast.error('El stock no puede ser negativo');
           setLoading(false);
           return;
        }

        const { error: stockError } = await supabase
          .from('product_warehouses')
          .upsert({
            product_id: product.id,
            warehouse_id: selectedWarehouseId,
            quantity: newStock
          }, { onConflict: 'product_id,warehouse_id' });
          
        if (stockError) throw stockError;

        // Log adjustment if stock changed
        if (newStock !== currentStock) {
           // We need the product_warehouse_id
           const { data: pwData } = await supabase
             .from('product_warehouses')
             .select('id')
             .eq('product_id', product.id)
             .eq('warehouse_id', selectedWarehouseId)
             .single();
             
           if (pwData) {
             await supabase.from('inventory_adjustments').insert({
               product_warehouse_id: pwData.id,
               adjustment_quantity: newStock - currentStock,
               reason: 'manual_adjustment',
               notes: 'Ajuste manual desde edición de producto'
             });
           }
        }
      }

      onSuccess();
      onOpenChange(false);
      toast.success('Producto actualizado correctamente');
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error('Error al actualizar el producto: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Producto</DialogTitle>
          <DialogDescription>
            Actualiza la información del producto
          </DialogDescription>
        </DialogHeader>

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
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Imagen del Producto</Label>
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
                  const file = e.target.files?.[0];
                  if (file) setImageFile(file);
                }}
                className="flex-1"
              />
            </div>
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
            <Label htmlFor="warehouse">Almacén *</Label>
            <Select
              value={selectedWarehouseId}
              onValueChange={(value) => setSelectedWarehouseId(value)}
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

          <div className="grid gap-4 sm:grid-cols-2">
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

            <div className="space-y-2">
              <Label htmlFor="stock">Stock *</Label>
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
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
