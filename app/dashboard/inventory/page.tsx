'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CreateProductDialog } from '@/components/dashboard/create-product-dialog';
import { EditProductDialog } from '@/components/dashboard/edit-product-dialog';
import { ProductThumbnail } from '@/components/dashboard/product-thumbnail';

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  active: boolean;
  created_at: string;
  quantity_sold: number;
  last_updated_at: string | null;
  warehouse_name: string;
  warehouse_count: number;
  image_url: string | null;
};

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WarehouseList } from '@/components/dashboard/warehouse-list';
import { InventoryMovementsList } from '@/components/dashboard/inventory-movements-list';
import { SyncStatus } from '@/components/ui/sync-status';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');

  const loadProducts = useCallback(async () => {
    try {
      console.debug('inventory-load-start');
      const { data, error } = await supabase
        .from('product_stock_summary')
        .select('*')
        .order('product_name');

      if (error) throw error;
      
      // Transform the data to match our Product type
      const transformedData = data?.map(item => ({
        id: item.product_id,
        name: item.product_name,
        sku: item.sku,
        price: item.price,
        stock: item.total_stock,
        active: item.active,
        created_at: item.created_at || '',
        quantity_sold: item.quantity_sold || 0,
        last_updated_at: item.last_stock_update,
        warehouse_name: item.warehouse_count > 1 ? `${item.warehouse_count} almacenes` : 'Principal',
        warehouse_count: item.warehouse_count || 0,
        image_url: item.image_url || null,
      })) || [];
      
      setProducts(transformedData);
      const maxDate =
        transformedData
          .map((p) => p.last_updated_at || p.created_at)
          .filter(Boolean)
          .map((d) => new Date(d as string).getTime())
          .reduce((a, b) => Math.max(a, b), 0) || Date.now();
      setLastUpdated(new Date(maxDate));
      console.debug('inventory-load-success', { count: transformedData.length });
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const filterProducts = useCallback(() => {
    let filtered = [...products];

    if (searchTerm) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (stockFilter !== 'all') {
      if (stockFilter === 'low') {
        filtered = filtered.filter((p) => p.stock < 10);
      } else if (stockFilter === 'out') {
        filtered = filtered.filter((p) => p.stock === 0);
      }
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, stockFilter]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    filterProducts();
  }, [filterProducts]);

  const totalStock = filteredProducts.reduce((sum, product) => sum + product.stock, 0);

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      loadProducts();
    } catch (error: any) {
      alert('Error al eliminar: ' + error.message);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    try {
      const { error } = await supabase
        .from('products')
        .update({ active: !active })
        .eq('id', id);
      if (error) throw error;
      loadProducts();
    } catch (error: any) {
      alert('Error al actualizar: ' + error.message);
    }
  }

  const totalValue = filteredProducts.reduce(
    (sum, product) => sum + Number(product.price) * product.stock,
    0
  );

  const lowStockCount = products.filter((p) => p.stock < 10 && p.stock > 0).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  if (loading) {
    return <div>Cargando inventario...</div>;
  }

  return (
    <div className="space-y-6">
      <SyncStatus loading={loading} lastUpdated={lastUpdated} onRefresh={loadProducts} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
          <p className="text-slate-500 mt-1">
            Gestiona tu catálogo de productos y stock
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="warehouses">Almacenes</TabsTrigger>
          <TabsTrigger value="movements">Movimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Productos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{products.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Stock Bajo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {lowStockCount}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Agotados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {outOfStockCount}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <select
              className="h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="low">Stock Bajo</option>
              <option value="out">Agotado</option>
            </select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Imagen</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Almacén</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No se encontraron productos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <ProductThumbnail src={product.image_url} alt={product.name} />
                      </TableCell>
                      <TableCell className="font-medium">
                        {product.name}
                        {product.warehouse_count > 1 && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Multi-almacén
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>${product.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <span
                          className={
                            product.stock === 0
                              ? 'text-red-600 font-bold'
                              : product.stock < 10
                              ? 'text-orange-600 font-bold'
                              : 'text-green-600 font-bold'
                          }
                        >
                          {product.stock}
                        </span>
                      </TableCell>
                      <TableCell>{product.warehouse_name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={product.active ? 'default' : 'destructive'}
                          className="cursor-pointer"
                          onClick={() => toggleActive(product.id, product.active)}
                        >
                          {product.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingProduct(product);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="warehouses">
          <WarehouseList />
        </TabsContent>

        <TabsContent value="movements">
          <InventoryMovementsList />
        </TabsContent>
      </Tabs>

      <CreateProductDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={loadProducts}
      />

      {editingProduct && (
        <EditProductDialog
          product={editingProduct}
          open={true}
          onOpenChange={(open) => !open && setEditingProduct(null)}
          onSuccess={loadProducts}
        />
      )}
    </div>
  );
}
