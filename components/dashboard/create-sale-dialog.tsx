'use client';

import { useState, useEffect, useRef } from 'react';
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
import { useAuth } from '@/lib/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showPartyNotification } from '@/lib/party-mode';
import { toast } from 'sonner';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

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
  const [saleDate, setSaleDate] = useState('');
  const [orderNumberSeq, setOrderNumberSeq] = useState('');

  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [promotionType, setPromotionType] = useState('none');
  const [discountValue, setDiscountValue] = useState(0);

  // Search states
  const [openLead, setOpenLead] = useState(false);
  const [searchLead, setSearchLead] = useState("");
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [creatingLead, setCreatingLead] = useState(false);

  const [openProduct, setOpenProduct] = useState(false);
  const [searchProduct, setSearchProduct] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (open) {
      loadData();
      setSelectedLead('');
      setChannel('facebook');
      setMarketingChannel('');
      setSelectedWarehouse('');
      setDeliveryCity('');
      setAgentName('');
      setSearchLead('');
      setSearchProduct('');
      
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setSaleDate(now.toISOString().slice(0, 16));

      setItems([]);
      setPromotionType('none');
      setDiscountValue(0);

      (async () => {
        try {
          const { data: seq, error } = await supabase.rpc('get_next_order_sequence');
          if (error) throw error;
          if (seq) {
            setOrderNumberSeq(String(seq).padStart(4, '0'));
          }
        } catch (err) {
          console.error("Error fetching next order sequence", err);
        }
      })();
    }
  }, [open]);

  // Lead search effect
  useEffect(() => {
    const searchLeads = async () => {
      if (!searchLead) {
        setFilteredLeads(leads.slice(0, 50));
        return;
      }
      
      // Local filter if we have few leads, otherwise API
      // Since requirements ask for API connection for searches:
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('id, name, email')
          .ilike('name', `%${searchLead}%`)
          .order('name')
          .limit(20);
          
        if (data) setFilteredLeads(data);
      } catch (err) {
        console.error("Error searching leads", err);
      }
    };

    const timer = setTimeout(searchLeads, 300);
    return () => clearTimeout(timer);
  }, [searchLead, leads]);

  // Product search effect
  useEffect(() => {
    const searchProducts = async () => {
      if (!searchProduct) {
        setFilteredProducts(products.slice(0, 50));
        return;
      }

      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('active', true)
          .ilike('name', `%${searchProduct}%`)
          .order('name')
          .limit(20);

        if (data) setFilteredProducts(data);
      } catch (err) {
         console.error("Error searching products", err);
      }
    };

    const timer = setTimeout(searchProducts, 300);
    return () => clearTimeout(timer);
  }, [searchProduct, products]);

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
    if (warehousesResult.data) {
      setWarehouses(warehousesResult.data);
      // Select first warehouse by default if available
      if (warehousesResult.data.length > 0) {
        setSelectedWarehouse(warehousesResult.data[0].id);
      }
    }
    if (agentsResult.data) setAgents(agentsResult.data as any);
  }

  async function createNewLead() {
    if (!searchLead) return;
    setCreatingLead(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert({ 
          name: searchLead,
          contact_channel: channel // Default to current selected channel in the form
        })
        .select()
        .single();
        
      if (error) throw error;
      if (data) {
        setLeads([...leads, data]);
        setFilteredLeads([...filteredLeads, data]);
        setSelectedLead(data.id);
        setOpenLead(false);
        setSearchLead("");
        toast.success(`Lead "${data.name}" creado correctamente`);
      }
    } catch (error: any) {
      toast.error("Error creando lead: " + error.message);
    } finally {
      setCreatingLead(false);
    }
  }

  function addProduct(product: Product) {
    // Check if already exists?
    // Requirement says "Allow multiple selection", but usually you don't add same product twice as separate rows, 
    // instead you increase quantity. But let's just add a new row for simplicity and flexibility.
    
    setItems(prev => [...prev, { 
      product_id: product.id, 
      quantity: 1, 
      price: product.price, 
      discount: 0 
    }]);
    
    // Don't close popover to allow multiple selection
    // But maybe clear search?
    // setSearchProduct(""); 
    toast.success(`Producto "${product.name}" agregado`);
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
      const seq = orderNumberSeq.trim() || '0001';
      const orderNumber = `BR${seq}`;

      // Validate order number format (client-side)
      if (!/^BR\d+$/.test(orderNumber)) {
        toast.error('Error interno: Formato de número de orden inválido');
        setLoading(false);
        return;
      }

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
              <Label htmlFor="order-number">Número de orden</Label>
              <div className="flex items-center gap-2">
               
               {/* <span className="text-sm font-medium text-slate-900 bg-slate-100 px-3 py-2 rounded-md border border-slate-200">
                  BR
                </span>
                */}
                <Input
                  id="order-number"
                  type="text"
                  value={orderNumberSeq}
                  onChange={(e) => setOrderNumberSeq(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 bg-white text-slate-900"
                />
              </div>
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
                      ? leads.find((lead) => lead.id === selectedLead)?.name || "Lead seleccionado"
                      : "Seleccionar lead..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command shouldFilter={false}> 
                    <CommandInput placeholder="Buscar lead..." value={searchLead} onValueChange={setSearchLead} />
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
                                   // Ensure lead is in the main list so it displays correctly
                                   if (!leads.find(l => l.id === lead.id)) {
                                      setLeads([...leads, lead]);
                                   }
                                   setSelectedLead(lead.id === selectedLead ? "" : lead.id);
                                   setOpenLead(false);
                                   setSearchLead("");
                                 }}
                               >
                                 <Check
                                   className={cn(
                                     "mr-2 h-4 w-4",
                                     selectedLead === lead.id ? "opacity-100" : "opacity-0"
                                   )}
                                 />
                                 {lead.name}
                                 {lead.email && <span className="ml-2 text-muted-foreground text-xs">({lead.email})</span>}
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
            <div className="flex flex-col gap-2">
                <Label>Productos</Label>
                <Popover open={openProduct} onOpenChange={setOpenProduct}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between text-muted-foreground">
                            <span className="flex items-center">
                                <SearchIcon className="mr-2 h-4 w-4" />
                                Buscar y agregar productos...
                            </span>
                        </Button>
                    </PopoverTrigger>
                     <PopoverContent className="w-[500px] p-0" align="start">
                        <Command shouldFilter={false}>
                            <CommandInput placeholder="Buscar producto..." value={searchProduct} onValueChange={setSearchProduct} />
                            <CommandList>
                                <CommandEmpty>No se encontraron productos.</CommandEmpty>
                                <CommandGroup>
                                    {filteredProducts.map((product) => (
                                        <CommandItem
                                            key={product.id}
                                            value={product.name}
                                            onSelect={() => {
                                                if (!products.find(p => p.id === product.id)) {
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
                const product = products.find(p => p.id === item.product_id);
                return (
                  <div key={index} className="flex gap-2 items-center border p-3 rounded-md bg-slate-50">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{product?.name || 'Producto desconocido'}</div>
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
            
              {items.length === 0 && (
                <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-md">
                  No hay productos agregados
                </div>
              )}
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
              {loading ? 'Creando...' : 'Crear Venta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
