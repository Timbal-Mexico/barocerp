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
import { useAuth } from '@/lib/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showPartyNotification } from '@/lib/party-mode';
import { toast } from 'sonner';

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

type Warehouse = {
  id: string;
  name: string;
};

type SaleItem = {
  product_id: string;
  quantity: number;
  price: number;
  discount: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function CreateSaleDialog({ open, onOpenChange, onSuccess }: Props) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [agents, setAgents] = useState<{ id: string; full_name: string }[]>([]);
  
  const [selectedLead, setSelectedLead] = useState('');
  const [channel, setChannel] = useState<string>('facebook');
  const [marketingChannel, setMarketingChannel] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [agentName, setAgentName] = useState('');
  const [saleDate, setSaleDate] = useState(''); // YYYY-MM-DDTHH:mm

  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [promotionType, setPromotionType] = useState('none');
  const [discountValue, setDiscountValue] = useState(0);

  useEffect(() => {
    if (open) {
      loadData();
      setSelectedLead('');
      setChannel('facebook');
      setMarketingChannel('');
      setSelectedWarehouse('');
      setDeliveryCity('');
      setAgentName('');
      
      // Set default date to now, adjusted for local timezone
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setSaleDate(now.toISOString().slice(0, 16));

      setItems([]);
      setPromotionType('none');
      setDiscountValue(0);
    }
  }, [open]);

  async function loadData() {
    const [leadsResult, productsResult, warehousesResult, agentsResult] = await Promise.all([
      supabase.from('leads').select('id, name, email').order('name'),
      supabase.from('products').select('*').eq('active', true).order('name'),
      supabase.from('warehouses').select('id, name').order('name'),
      supabase.from('profiles').select('id, full_name').order('full_name'),
    ]);

    if (leadsResult.data) setLeads(leadsResult.data);
    if (productsResult.data) setProducts(productsResult.data);
    if (warehousesResult.data) {
      setWarehouses(warehousesResult.data);
      // Select first warehouse by default if available
      if (warehousesResult.data.length > 0) {
        setSelectedWarehouse(warehousesResult.data[0].id);
      }
    }
    if (agentsResult.data) setAgents(agentsResult.data as any);
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
      discount = subtotal * (2 / 3); // ~66.67%
    } else if (promotionType === '3x2') {
      discount = subtotal * (1 / 3); // ~33.33%
    } else if (promotionType === 'percentage') {
      discount = subtotal * (Math.min(Math.max(discountValue, 0), 100) / 100);
    }
    const total = subtotal - discount;
    return total < 0 ? 0 : total;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (!selectedLead) {
        toast.error('Por favor selecciona un lead');
        setLoading(false);
        return;
      }

      if (items.length === 0) {
        toast.error('Agrega al menos un producto');
        setLoading(false);
        return;
      }
      
      if (!selectedWarehouse) {
        toast.error('Por favor selecciona un almacén');
        setLoading(false);
        return;
      }

      // Check stock availability in the selected warehouse for all items
      for (const item of items) {
        const product = products.find(p => p.id === item.product_id);
        if (!product) continue;

        const { data: stockData, error: stockError } = await supabase
          .from('product_warehouses')
          .select('quantity')
          .eq('product_id', item.product_id)
          .eq('warehouse_id', selectedWarehouse)
          .single();

        if (stockError && stockError.code !== 'PGRST116') throw stockError; // PGRST116 is no rows found

        const availableStock = stockData?.quantity || 0;

        if (availableStock < item.quantity) {
          toast.error(`Stock insuficiente para ${product.name} en el almacén seleccionado. Disponible: ${availableStock}`);
          setLoading(false);
          return;
        }
      }

      const totalAmount = calculateTotal();

      // Generate sequential order number: NNNN-BR starting at 1938
      let nextSeq = 1938;
      const { data: lastSale } = await supabase
        .from('sales')
        .select('order_number, created_at')
        .like('order_number', '%-BR')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastSale?.order_number) {
        const match = String(lastSale.order_number).match(/^(\d+)-BR$/);
        if (match) {
          const lastNum = parseInt(match[1], 10);
          if (!isNaN(lastNum) && lastNum >= 1938) {
            nextSeq = lastNum + 1;
          }
        }
      }
      const orderNumber = `${nextSeq}-BR`;

      // Try to include promotion fields if they exist in DB (using any to bypass strict type check for now)
      const saleData: any = {
        order_number: orderNumber,
        lead_id: selectedLead || null,
        channel,
        total_amount: totalAmount,
        promotion_type: promotionType,
        discount_value: promotionType === 'percentage' ? discountValue : 0,
        marketing_channel: marketingChannel || null,
        warehouse_id: selectedWarehouse || null,
        delivery_city: deliveryCity || null,
        agent_name: agentName || null,
        created_at: new Date(saleDate).toISOString(),
      };

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert(saleData)
        .select()
        .single();

      if (saleError) throw saleError;

      const saleItems = items.map((item) => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        discount: 0,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      onSuccess();
      onOpenChange(false);
      showPartyNotification('¡Venta registrada con éxito!');
    } catch (error: any) {
      console.error('Error creating sale:', error);
      toast.error('Error al crear la venta: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const totalAmount = calculateTotal();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Venta</DialogTitle>
          <DialogDescription>
            Crea una nueva venta y descuenta automáticamente el inventario
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha de venta</Label>
              <Input
                id="date"
                type="datetime-local"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promotion">Tipo de descuento</Label>
              <Select
                value={promotionType}
                onValueChange={setPromotionType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar promoción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin descuento</SelectItem>
                  <SelectItem value="2x1">2x1</SelectItem>
                  <SelectItem value="3x1">3x1</SelectItem>
                  <SelectItem value="3x2">3x2</SelectItem>
                  <SelectItem value="percentage">% personalizado</SelectItem>
                </SelectContent>
              </Select>
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

            <div className="space-y-2">
              <Label htmlFor="lead">Lead (opcional)</Label>
              <select
                id="lead"
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
              <Label htmlFor="warehouse">Almacén</Label>
              <select
                id="warehouse"
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
              <Label htmlFor="channel">Canal de venta</Label>
              <select
                id="channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              >
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="web">Web</option>
                <option value="organico">Orgánico</option>
                <option value="shopify">Shopify</option>
                <option value="other">Otro</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marketing">Canal de marketing</Label>
              <Input
                id="marketing"
                value={marketingChannel}
                onChange={(e) => setMarketingChannel(e.target.value)}
                placeholder="Ej. Facebook Ads, Influencer..."
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="city">Ciudad de entrega</Label>
              <Input
                id="city"
                value={deliveryCity}
                onChange={(e) => setDeliveryCity(e.target.value)}
                placeholder="Ciudad de destino"
              />
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
              {loading ? 'Creando...' : 'Crear Venta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
