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
import { X, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Lead = {
  id: string;
  name: string;
  email: string | null;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
};

type SaleItem = {
  id?: string;
  product_id: string;
  quantity: number;
  price: number;
  discount: number;
};

type Sale = {
  id: string;
  order_number: string;
  lead_id: string | null;
  channel: string;
  total_amount: number;
  created_at: string;
  leads: { name: string } | null;
  promotion_type?: string;
  discount_value?: number;
  warehouse_id?: string;
  marketing_channel?: string;
  delivery_city?: string;
  agent_name?: string;
  source?: string;
};

type Warehouse = {
  id: string;
  name: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  sale: Sale | null;
};

export function EditSaleDialog({ open, onOpenChange, onSuccess, sale }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [agents, setAgents] = useState<{ id: string; full_name: string }[]>([]);
  
  const [selectedLead, setSelectedLead] = useState('');
  const [channel, setChannel] = useState<string>('facebook');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [promotionType, setPromotionType] = useState('none');
  const [discountValue, setDiscountValue] = useState(0);
  
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [marketingChannel, setMarketingChannel] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [agentName, setAgentName] = useState('');

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  useEffect(() => {
    if (sale && open) {
      setSelectedLead(sale.lead_id || '');
      setChannel(sale.channel || 'facebook');
      setPromotionType(sale.promotion_type || 'none');
      setDiscountValue(sale.discount_value || 0);
      
      setSelectedWarehouse(sale.warehouse_id || '');
      setMarketingChannel(sale.marketing_channel || '');
      setDeliveryCity(sale.delivery_city || '');
      setAgentName(sale.agent_name || '');
      
      loadSaleItems(sale.id);
    }
  }, [sale, open]);

  async function loadData() {
    const [leadsResult, productsResult, warehousesResult, agentsResult] = await Promise.all([
      supabase.from('leads').select('id, name, email').order('name'),
      supabase.from('products').select('*').eq('active', true).order('name'),
      supabase.from('warehouses').select('id, name').order('name'),
      supabase.from('profiles').select('id, full_name').order('full_name'),
    ]);

    if (leadsResult.data) setLeads(leadsResult.data);
    if (productsResult.data) setProducts(productsResult.data);
    if (warehousesResult.data) setWarehouses(warehousesResult.data);
    if (agentsResult.data) setAgents(agentsResult.data as any);
  }

  async function loadSaleItems(saleId: string) {
    const { data, error } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', saleId);

    if (data) {
      setItems(
        data.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount || 0,
        }))
      );
    }
  }

  function addItem() {
    setItems([...items, { product_id: '', quantity: 1, price: 0, discount: 0 }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof SaleItem, value: string | number) {
    const newItems = [...items];
    if (field === 'product_id') {
      newItems[index].product_id = value as string;
      const product = products.find((p) => p.id === value);
      if (product) {
        newItems[index].price = product.price;
      }
    } else if (field === 'quantity') {
      newItems[index].quantity = value as number;
    } else if (field === 'price') {
      newItems[index].price = value as number;
    } else if (field === 'discount') {
      newItems[index].discount = value as number;
    }

    setItems(newItems);
  }

  function calculateTotal() {
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    );
    let discount = 0;
    if (promotionType === '2x1') {
      discount = subtotal * 0.5;
    } else if (promotionType === '3x1') {
      discount = subtotal * (2 / 3);
    } else if (promotionType === '3x2') {
      discount = subtotal * (1 / 3);
    } else if (promotionType === 'percentage') {
      discount = subtotal * (Math.min(Math.max(discountValue, 0), 100) / 100);
    }
    const total = subtotal - discount;
    return total < 0 ? 0 : total;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sale) return;
    setLoading(true);

    try {
      if (items.length === 0) {
        alert('Agrega al menos un producto');
        return;
      }

      for (const item of items) {
        if (!item.product_id) {
          alert('Selecciona un producto para todos los items');
          return;
        }
        if (item.quantity <= 0) {
          alert('La cantidad debe ser mayor a 0');
          return;
        }
      }

      const totalAmount = calculateTotal();

      // Logic for updates with stock management:
      // 1. Delete existing items. 
      //    - Trigger `restore_inventory_on_sale_item_delete` will restore stock to the warehouse defined in the sale record (OLD warehouse).
      // 2. Update sale record.
      //    - This sets the NEW warehouse_id if changed.
      // 3. Insert new items.
      //    - Trigger `deduct_inventory_on_sale` will deduct stock from the warehouse defined in the sale record (NEW warehouse).
      
      // Step 1: Delete items
      const { error: deleteError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', sale.id);

      if (deleteError) throw deleteError;

      // Step 2: Update sale
      const saleUpdateData: any = {
        order_number: sale.order_number,
        lead_id: selectedLead || null,
        channel,
        total_amount: totalAmount,
        promotion_type: promotionType,
        discount_value: promotionType === 'percentage' ? discountValue : 0,
        warehouse_id: selectedWarehouse || null,
        marketing_channel: marketingChannel || null,
        delivery_city: deliveryCity || null,
        agent_name: agentName || null,
      };

      const { error: saleError } = await supabase
        .from('sales')
        .update(saleUpdateData)
        .eq('id', sale.id);

      if (saleError) throw saleError;

      // Step 3: Insert items
      const saleItems = items.map((item) => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount || 0
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating sale:', error);
      alert('Error al actualizar la venta: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const totalAmount = calculateTotal();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Venta</DialogTitle>
          <DialogDescription>
            Modifica los detalles de la venta {sale?.order_number}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="order-number">Número de orden</Label>
              <Input
                id="order-number"
                value={sale?.order_number || ''}
                onChange={(e) => {
                  if (!sale) return;
                  // local mirror; we update on submit
                  sale.order_number = e.target.value;
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lead">Lead (opcional)</Label>
              <select
                id="edit-lead"
                value={selectedLead}
                onChange={(e) => setSelectedLead(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Sin lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name} {lead.email ? `(${lead.email})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-channel">Canal de venta</Label>
              <select
                id="edit-channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="web">Sitio Web</option>
                <option value="organico">Orgánico</option>
                <option value="shopify">Shopify</option>
                <option value="other">Otro</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="promotion">Tipo de descuento</Label>
              <select
                id="promotion"
                value={promotionType}
                onChange={(e) => setPromotionType(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="none">Sin descuento</option>
                <option value="2x1">2x1</option>
                <option value="3x1">3x1</option>
                <option value="3x2">3x2</option>
                <option value="percentage">% personalizado</option>
              </select>
              {promotionType === 'percentage' && (
                <div className="space-y-2">
                  <Label htmlFor="discountValue">% de descuento</Label>
                  <Input
                    id="discountValue"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    placeholder="Ej. 10 para 10%"
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-warehouse">Almacén</Label>
              <select
                id="edit-warehouse"
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Seleccionar almacén</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marketing-channel">Canal de marketing</Label>
              <Input
                id="marketing-channel"
                value={marketingChannel}
                onChange={(e) => setMarketingChannel(e.target.value)}
                placeholder="Ej. Ads, Referido"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery-city">Ciudad de entrega</Label>
              <Input
                id="delivery-city"
                value={deliveryCity}
                onChange={(e) => setDeliveryCity(e.target.value)}
                placeholder="Ciudad"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent">Agente de ventas</Label>
              <Select
                value={agentName}
                onValueChange={setAgentName}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar agente" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.full_name || agent.id}>
                      {agent.full_name || 'Usuario ' + agent.id.slice(0, 4)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Productos</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Producto
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1">
                  <select
                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={item.product_id}
                    onChange={(e) =>
                      updateItem(index, 'product_id', e.target.value)
                    }
                    required
                  >
                    <option value="">Seleccionar producto...</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} (${product.price}) - Stock: {product.stock}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-20">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Cant."
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, 'quantity', Number(e.target.value))
                    }
                    required
                  />
                </div>
                <div className="w-24">
                   <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Desc."
                    value={item.discount || ''}
                    onChange={(e) =>
                      updateItem(index, 'discount', Number(e.target.value))
                    }
                  />
                </div>
                <div className="w-24 pt-2 text-right text-sm font-medium">
                  ${((item.price - (item.discount || 0)) * item.quantity).toFixed(2)}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end text-lg font-bold">
            Total: ${calculateTotal().toFixed(2)}
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
