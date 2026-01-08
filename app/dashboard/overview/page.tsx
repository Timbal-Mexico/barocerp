'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  Package,
} from 'lucide-react';

type KPIData = {
  todaySales: number;
  monthSales: number;
  totalLeads: number;
  totalProducts: number;
  lowStockProducts: number;
  salesByChannel: { channel: string; total: number; count: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  monthlyGoal: { target: number; current: number; percentage: number } | null;
};

export default function OverviewPage() {
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const [
        todaySalesResult,
        monthSalesResult,
        leadsResult,
        productsResult,
        lowStockResult,
        channelSalesResult,
        topProductsResult,
        goalResult,
      ] = await Promise.all([
        supabase
          .from('sales')
          .select('total_amount')
          .gte('created_at', todayStart.toISOString()),
        supabase
          .from('sales')
          .select('total_amount')
          .gte('created_at', monthStart.toISOString()),
        supabase.from('leads').select('id', { count: 'exact' }),
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('products').select('id', { count: 'exact' }).lt('stock', 10),
        supabase
          .from('sales')
          .select('channel, total_amount')
          .gte('created_at', monthStart.toISOString()),
        supabase
          .from('sale_items')
          .select('quantity, price, product_id, products(name)')
          .gte('created_at', monthStart.toISOString()),
        supabase
          .from('goals')
          .select('target_amount')
          .eq('month', currentMonth)
          .eq('channel', 'all')
          .maybeSingle(),
      ]);

      const todaySales = todaySalesResult.data?.reduce(
        (sum, sale) => sum + Number(sale.total_amount),
        0
      ) || 0;

      const monthSales = monthSalesResult.data?.reduce(
        (sum, sale) => sum + Number(sale.total_amount),
        0
      ) || 0;

      const salesByChannel = channelSalesResult.data?.reduce((acc, sale) => {
        const existing = acc.find((item) => item.channel === sale.channel);
        if (existing) {
          existing.total += Number(sale.total_amount);
          existing.count += 1;
        } else {
          acc.push({
            channel: sale.channel,
            total: Number(sale.total_amount),
            count: 1,
          });
        }
        return acc;
      }, [] as { channel: string; total: number; count: number }[]) || [];

      const productSales = topProductsResult.data?.reduce((acc, item: any) => {
        const productName = item.products?.name || 'Desconocido';
        const existing = acc.find((p) => p.name === productName);
        const revenue = Number(item.quantity) * Number(item.price);
        if (existing) {
          existing.quantity += Number(item.quantity);
          existing.revenue += revenue;
        } else {
          acc.push({
            name: productName,
            quantity: Number(item.quantity),
            revenue,
          });
        }
        return acc;
      }, [] as { name: string; quantity: number; revenue: number }[]) || [];

      const topProducts = productSales
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const monthlyGoal = goalResult.data
        ? {
            target: Number(goalResult.data.target_amount),
            current: monthSales,
            percentage: (monthSales / Number(goalResult.data.target_amount)) * 100,
          }
        : null;

      setData({
        todaySales,
        monthSales,
        totalLeads: leadsResult.count || 0,
        totalProducts: productsResult.count || 0,
        lowStockProducts: lowStockResult.count || 0,
        salesByChannel: salesByChannel.sort((a, b) => b.total - a.total),
        topProducts,
        monthlyGoal,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Cargando datos...</div>;
  }

  if (!data) {
    return <div>Error al cargar datos</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Resumen general del sistema ERP
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ventas Hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.todaySales.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Mes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.monthSales.toFixed(2)}
            </div>
            {data.monthlyGoal && (
              <p className="text-xs text-slate-500 mt-1">
                {data.monthlyGoal.percentage.toFixed(0)}% del objetivo
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalLeads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Stock Bajo
            </CardTitle>
            <Package className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {data.lowStockProducts}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Productos con menos de 10 unidades
            </p>
          </CardContent>
        </Card>
      </div>

      {data.monthlyGoal && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Objetivo Mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso</span>
                <span className="font-medium">
                  ${data.monthlyGoal.current.toFixed(2)} / $
                  {data.monthlyGoal.target.toFixed(2)}
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-900 transition-all"
                  style={{
                    width: `${Math.min(data.monthlyGoal.percentage, 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-500">
                {data.monthlyGoal.percentage >= 100
                  ? 'Objetivo alcanzado'
                  : `Falta $${(data.monthlyGoal.target - data.monthlyGoal.current).toFixed(2)}`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ventas por Canal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.salesByChannel.map((channel) => (
                <div key={channel.channel} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">
                      {channel.channel}
                    </span>
                    <span className="text-slate-500">
                      ${channel.total.toFixed(2)} ({channel.count} ventas)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-900"
                      style={{
                        width: `${(channel.total / data.monthSales) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topProducts.map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <div className="text-sm font-medium">{product.name}</div>
                      <div className="text-xs text-slate-500">
                        {product.quantity} unidades
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    ${product.revenue.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
