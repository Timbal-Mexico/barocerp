'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

type Props = {
  productId: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FullProduct = {
  name: string;
  description?: string | null;
  specs?: any;
  price: number;
  active: boolean;
  sku: string;
  image_url?: string | null;
};

export function ProductDetailDialog({
  productId,
  name,
  price,
  stock,
  imageUrl,
  open,
  onOpenChange,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<FullProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warehouseStocks, setWarehouseStocks] = useState<{ name: string; available: number }[]>([]);

  useEffect(() => {
    async function load() {
      if (!open) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();
        if (error) throw error;
        const p: FullProduct = {
          name: data?.name || name,
          description: data?.description ?? null,
          specs: data?.specs ?? null,
          price: Number(data?.price ?? price),
          active: Boolean(data?.active ?? true),
          sku: data?.sku || '',
          image_url: data?.image_url ?? imageUrl ?? null,
        };
        setProduct(p);
        const ws = await supabase
          .from('product_warehouses')
          .select(`
            available_quantity,
            warehouses(name)
          `)
          .eq('product_id', productId);
        if (ws.error) throw ws.error;
        const rows = (ws.data as any[]) || [];
        const transformed = rows.map(r => {
          const wh = Array.isArray(r.warehouses) ? r.warehouses[0] : r.warehouses;
          return {
            name: wh?.name || 'Almacén',
            available: Number(r.available_quantity || 0),
          };
        });
        setWarehouseStocks(transformed);
      } catch (e: any) {
        setError(e?.message || 'Error cargando producto');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [open, productId, name, price, imageUrl]);

  const displayName = product?.name ?? name;
  const displayPrice = product?.price ?? price;
  const displayImage = product?.image_url ?? imageUrl ?? null;
  const displayDescription = product?.description ?? null;
  const available = stock > 0;
  const totalAvailable = warehouseStocks.length
    ? warehouseStocks.reduce((s, w) => s + w.available, 0)
    : Number(stock || 0);
  const palette = [
    'bg-blue-600',
    'bg-emerald-600',
    'bg-amber-600',
    'bg-violet-600',
    'bg-rose-600',
    'bg-cyan-600',
    'bg-indigo-600',
    'bg-orange-600',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/2 bg-black/5">
            {displayImage ? (
              <div className="relative w-full h-64 md:h-full">
                <Image
                  src={displayImage}
                  alt={displayName}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  quality={80}
                  priority={false}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center w-full h-64 md:h-full bg-slate-100">
                <span className="text-slate-400 text-sm">Sin imagen</span>
              </div>
            )}
          </div>
          <div className="md:w-1/2 p-6">
            <DialogHeader>
              <DialogTitle className="text-xl md:text-2xl">{displayName}</DialogTitle>
              <DialogDescription>
                {product?.sku ? <span className="text-xs text-slate-500">SKU: {product.sku}</span> : null}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold">${Number(displayPrice).toFixed(2)}</span>
                <Badge variant={available ? 'default' : 'destructive'}>
                  {available ? 'Disponible' : 'Agotado'}
                </Badge>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700">Descripción</h4>
                <p className="text-sm text-slate-600 mt-1">
                  {displayDescription || 'No especificada'}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700">Stock por almacén</h4>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge className="bg-slate-800 text-white">
                    {totalAvailable} - Total
                  </Badge>
                  {warehouseStocks.length ? (
                    warehouseStocks.map((w, idx) => (
                      <Badge
                        key={`${w.name}-${idx}`}
                        className={`${palette[idx % palette.length]} text-white`}
                      >
                        {w.available} - {w.name}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="secondary">Sin almacenes configurados</Badge>
                  )}
                </div>
              </div>

              {error ? (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">{error}</div>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
