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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function CreateLeadDialog({ open, onOpenChange, onSuccess }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    interest_product_id: '',
    contact_channel: 'facebook',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadProducts();
      setFormData({
        name: '',
        email: '',
        phone: '',
        interest_product_id: '',
        contact_channel: 'facebook',
      });
    }
  }, [open]);

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('id, name')
      .eq('active', true)
      .order('name');

    if (data) setProducts(data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('leads').insert({
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        interest_product_id: formData.interest_product_id || null,
        contact_channel: formData.contact_channel,
      });

      if (error) throw error;

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating lead:', error);
      alert('Error al crear el lead: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Lead</DialogTitle>
          <DialogDescription>
            Registra un nuevo contacto potencial en el CRM
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
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
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interest_product">Producto de interés</Label>
            <select
              id="interest_product"
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
            <Label htmlFor="contact_channel">Canal de contacto *</Label>
            <select
              id="contact_channel"
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
              {loading ? 'Creando...' : 'Crear Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
