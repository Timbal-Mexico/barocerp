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
import { X, Plus, Check, ChevronsUpDown, Search as SearchIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

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
  const [orderNumberSeq, setOrderNumberSeq] = useState('');

  const [openLead, setOpenLead] = useState(false);
  const [searchLead, setSearchLead] = useState('');
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [creatingLead, setCreatingLead] = useState(false);

  const [openProduct, setOpenProduct] = useState(false);
  const [searchProduct, setSearchProduct] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

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
      if (sale.order_number) {
        const oldMatch = String(sale.order_number).match(/^(\d+)-BR$/);
        const newMatch = String(sale.order_number).match(/^BR(\d+)$/);
        
        if (newMatch) {
          setOrderNumberSeq(newMatch[1]);
        } else if (oldMatch) {
          setOrderNumberSeq(oldMatch[1]);
        } else {
          setOrderNumberSeq(sale.order_number);
        }
      } else {
        setOrderNumberSeq('');
      }
      
      loadSaleItems(sale.id);
    }
  }, [sale, open]);

  async function loadData() {
    const [leadsResult, productsResult, warehousesResult, agentsResult] = await Promise.all([
      supabase.from('leads').select('id, name, email').order('name').limit(50),
      supabase.from('products').select('*').eq('active', true).order('name').limit(50),
      supabase.from('warehouses').select('id, name').order('name'),
      supabase.from('profiles').select('id, full_name').order('full_name'),
    ]);

    if (leadsResult.data) {
      setLeads(leadsResult.data);
      setFilteredLeads(leadsResult.data);
    }
    if (productsResult.data) {
      setProducts(productsResult.data);
      setFilteredProducts(productsResult.data);
    }
    if (warehousesResult.data) setWarehouses(warehousesResult.data);
    if (agentsResult.data) setAgents(agentsResult.data as any);
  }

  useEffect(() => {
    const search = async () => {
      if (!searchLead) {
        setFilteredLeads(leads.slice(0, 50));
        return;
      }

      try {
        const { data } = await supabase
          .from('leads')
          .select('id, name, email')
          .ilike('name', `%${searchLead}%`)
          .order('name')
          .limit(20);
        if (data) setFilteredLeads(data);
      } catch (error) {
        console.error('Error searching leads', error);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [searchLead, leads]);

  useEffect(() => {
    const search = async () => {
      if (!searchProduct) {
        setFilteredProducts(products.slice(0, 50));
        return;
      }

      try {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('active', true)
          .ilike('name', `%${searchProduct}%`)
          .order('name')
          .limit(20);
        if (data) setFilteredProducts(data);
      } catch (error) {
        console.error('Error searching products', error);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [searchProduct, products]);

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

  async function createNewLead() {
    if (!searchLead) return;
    setCreatingLead(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert({
          name: searchLead,
          contact_channel: channel,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setLeads([...leads, data]);
        setFilteredLeads([...filteredLeads, data]);
        setSelectedLead(data.id);
        setOpenLead(false);
        setSearchLead('');
      }
    } catch (error) {
      console.error('Error creating lead', error);
      alert('Error al crear el lead');
    } finally {
      setCreatingLead(false);
    }
  }

  function addProduct(product: Product) {
    setItems(prev => [
      ...prev,
      {
        product_id: product.id,
        quantity: 1,
        price: product.price,
        discount: 0,
      },
    ]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof SaleItem, value: string | number) {
    const newItems = [...items];
    if (field === 'quantity') {
      newItems[index].quantity = value as number;
    } else if (field === 'price') {
      newItems[index].price = value as number;
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
      const seq = orderNumberSeq.trim() || sale.order_number;
      const orderNumber = `BR${seq}`;

      if (!/^BR\d+$/.test(orderNumber) && !/^ORD-\d{4}-\d{4}$/.test(orderNumber)) {
        alert('Error interno: Formato de número de orden inválido');
        setLoading(false);
        return;
      }

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
        order_number: orderNumber,
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
        discount: 0,
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
              <div className="flex items-center gap-2">
                {/* 
                <span className="text-sm font-medium text-slate-900 bg-slate-100 px-3 py-2 rounded-md border border-slate-200">
                  BR
                </span>
                */}
                <Input
                  id="order-number"
                  type="text"
                  value={orderNumberSeq}
                  readOnly
                  disabled
                  className="flex-1 bg-slate-50 text-slate-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lead / Cliente</Label>
              <Popover open={openLead} onOpenChange={setOpenLead}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openLead}
                    className="w-full justify-between"
                  >
                    {selectedLead
                      ? leads.find((lead) => lead.id === selectedLead)?.name || 'Lead seleccionado'
                      : 'Seleccionar lead...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar lead..."
                      value={searchLead}
                      onValueChange={setSearchLead}
                    />
                    <CommandList>
                      {creatingLead ? (
                        <CommandItem disabled>Creando lead...</CommandItem>
                      ) : (
                        <>
                          <CommandEmpty>
                            <div className="p-2">
                              <p className="text-sm text-muted-foreground mb-2">
                                No se encontró {searchLead}
                              </p>
                              {searchLead && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full"
                                  onClick={createNewLead}
                                >
                                  <Plus className="mr-2 h-4 w-4" /> Crear {searchLead}
                                </Button>
                              )}
                            </div>
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredLeads.map((lead) => (
                              <CommandItem
                                key={lead.id}
                                value={lead.name}
                                onSelect={() => {
                                  if (!leads.find((l) => l.id === lead.id)) {
                                    setLeads([...leads, lead]);
                                  }
                                  setSelectedLead(lead.id === selectedLead ? '' : lead.id);
                                  setOpenLead(false);
                                  setSearchLead('');
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    selectedLead === lead.id ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                {lead.name}
                                {lead.email && (
                                  <span className="ml-2 text-muted-foreground text-xs">
                                    ({lead.email})
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
            <div className="flex flex-col gap-2">
              <Label>Productos</Label>
              <Popover open={openProduct} onOpenChange={setOpenProduct}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between text-muted-foreground"
                  >
                    <span className="flex items-center">
                      <SearchIcon className="mr-2 h-4 w-4" />
                      Buscar y agregar productos...
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar producto..."
                      value={searchProduct}
                      onValueChange={setSearchProduct}
                    />
                    <CommandList>
                      <CommandEmpty>No se encontraron productos.</CommandEmpty>
                      <CommandGroup>
                        {filteredProducts.map((product) => (
                          <CommandItem
                            key={product.id}
                            value={product.name}
                            onSelect={() => {
                              if (!products.find((p) => p.id === product.id)) {
                                setProducts([...products, product]);
                              }
                              addProduct(product);
                            }}
                          >
                            <div className="flex flex-col w-full">
                              <span>{product.name}</span>
                              <span className="text-xs text-muted-foreground flex justify-between mt-1">
                                <span>SKU: {product.sku}</span>
                                <span>${product.price} | Stock: {product.stock}</span>
                              </span>
                            </div>
                            <Plus className="ml-2 h-4 w-4 shrink-0" />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => {
                const product = products.find((p) => p.id === item.product_id);
                return (
                  <div
                    key={index}
                    className="flex gap-2 items-center border p-3 rounded-md bg-slate-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {product?.name || 'Producto desconocido'}
                      </div>
                      <div className="text-xs text-muted-foreground">SKU: {product?.sku}</div>
                    </div>
                    <div className="w-20">
                      <Input
                        type="number"
                        min="1"
                        className="h-8"
                        placeholder="Cant."
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, 'quantity', Number(e.target.value))
                        }
                        required
                      />
                    </div>
                    <div className="w-24 text-right text-sm font-medium">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeItem(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
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
