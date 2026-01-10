'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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

type Product = {
  id: string;
  name: string;
};

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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  lead: Lead | null;
};

export function EditLeadDialog({ open, onOpenChange, onSuccess, lead }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<{ id: string; order_number: string }[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    interest_product_id: '',
    contact_channel: 'facebook',
    assigned_sale_id: '',
    assigned_list: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadProducts();
      loadSales();
    }
  }, [open]);

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        interest_product_id: lead.interest_product_id || '',
        contact_channel: lead.contact_channel || 'facebook',
        assigned_sale_id: (lead as any).assigned_sale_id || '',
        assigned_list: (lead as any).assigned_list || '',
      });
    }
  }, [lead]);

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('id, name')
      .eq('active', true)
      .order('name');

    if (data) setProducts(data);
  }
  async function loadSales() {
    const { data } = await supabase
      .from('sales')
      .select('id, order_number')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setSales(data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lead) return;
    
    setLoading(true);

    try {
      const { error } = await supabase
        .from('leads')
        .update({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          interest_product_id: formData.interest_product_id || null,
          contact_channel: formData.contact_channel,
          assigned_sale_id: formData.assigned_sale_id || null,
          assigned_list: formData.assigned_list || null,
        })
        .eq('id', lead.id);

      if (error) throw error;

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating lead:', error);
      alert('Error al actualizar el lead: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Lead</DialogTitle>
          <DialogDescription>
            Modifica la información del contacto
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nombre *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Correo electrónico</Label>
            <Input
              id="edit-email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-phone">Teléfono</Label>
            <Input
              id="edit-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-interest_product">Producto de interés</Label>
            <select
              id="edit-interest_product"
              value={formData.interest_product_id}
              onChange={(e) =>
                setFormData({ ...formData, interest_product_id: e.target.value })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">No especificado</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-contact_channel">Canal de contacto *</Label>
            <select
              id="edit-contact_channel"
              value={formData.contact_channel}
              onChange={(e) =>
                setFormData({ ...formData, contact_channel: e.target.value })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            >
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="web">Web</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-assigned_sale">Asignar a venta</Label>
            <select
              id="edit-assigned_sale"
              value={formData.assigned_sale_id}
              onChange={(e) =>
                setFormData({ ...formData, assigned_sale_id: e.target.value })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Sin asignar</option>
              {sales.map((sale) => (
                <option key={sale.id} value={sale.id}>
                  {sale.order_number}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-assigned_list">Lista de ventas (opcional)</Label>
            <Input
              id="edit-assigned_list"
              value={formData.assigned_list}
              onChange={(e) =>
                setFormData({ ...formData, assigned_list: e.target.value })
              }
            />
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
