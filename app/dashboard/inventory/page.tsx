'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CreateProductDialog } from '@/components/dashboard/create-product-dialog';
import { EditProductDialog } from '@/components/dashboard/edit-product-dialog';

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  active: boolean;
  created_at: string;
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, stockFilter]);

  async function loadProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterProducts() {
    let filtered = [...products];

    if (searchTerm) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (stockFilter === 'low') {
      filtered = filtered.filter((product) => product.stock < 10);
    } else if (stockFilter === 'out') {
      filtered = filtered.filter((product) => product.stock === 0);
    }

    setFilteredProducts(filtered);
  }

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

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Buscar por nombre o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">Todos los productos</option>
              <option value="low">Stock bajo (menos de 10)</option>
              <option value="out">Agotados</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm font-medium text-slate-500">
                  <th className="pb-3 pr-4">Producto</th>
                  <th className="pb-3 pr-4">SKU</th>
                  <th className="pb-3 pr-4 text-right">Precio</th>
                  <th className="pb-3 pr-4 text-right">Stock</th>
                  <th className="pb-3 pr-4">Estado</th>
                  <th className="pb-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No se encontraron productos
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 pr-4 font-medium">{product.name}</td>
                      <td className="py-3 pr-4 font-mono text-xs">
                        {product.sku}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium">
                        ${Number(product.price).toFixed(2)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            product.stock === 0
                              ? 'bg-red-100 text-red-700'
                              : product.stock < 10
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {product.stock}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <button
                          onClick={() => toggleActive(product.id, product.active)}
                          className={`text-xs px-2 py-1 rounded ${
                            product.active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {product.active ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingProduct(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
