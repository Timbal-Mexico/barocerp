'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { InventoryMovementDialog } from './inventory-movement-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type InventoryMovement = {
  id: string;
  created_at: string;
  reason: string;
  quantity_change: number;
  type: 'sale' | 'adjustment' | 'transfer';
  product_id: string;
  warehouse_id: string | null;
  to_warehouse_id: string | null;
  product_name: string;
  product_sku: string;
  warehouse_name: string | null;
  to_warehouse_name: string | null;
};

export function InventoryMovementsList() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [movementToDelete, setMovementToDelete] = useState<InventoryMovement | null>(null);

  useEffect(() => {
    loadMovements();
  }, []);

  async function loadMovements() {
    try {
      const { data, error } = await supabase
        .from('unified_inventory_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error('Error loading movements:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!movementToDelete) return;

    try {
      let table = '';
      if (movementToDelete.type === 'adjustment') table = 'inventory_adjustments';
      else if (movementToDelete.type === 'transfer') table = 'inventory_transfers';
      else {
        alert('No se pueden eliminar movimientos de venta directamente. Cancela la venta en su lugar.');
        setMovementToDelete(null);
        return;
      }

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', movementToDelete.id);

      if (error) throw error;

      loadMovements();
    } catch (error: any) {
      console.error('Error deleting movement:', error);
      alert('Error al eliminar: ' + error.message);
    } finally {
      setMovementToDelete(null);
    }
  }

  function getReasonBadge(reason: string, type: string) {
    if (type === 'transfer') return <Badge variant="outline" className="border-blue-500 text-blue-500">Transferencia</Badge>;
    if (type === 'sale') return <Badge variant="secondary">Venta</Badge>;
    
    switch (reason) {
      case 'initial_stock':
        return <Badge variant="default">Stock Inicial</Badge>;
      case 'in_purchase':
        return <Badge className="bg-green-500 hover:bg-green-600">Compra</Badge>;
      case 'out_loss':
      case 'out_damage':
        return <Badge variant="destructive">Pérdida/Daño</Badge>;
      default:
        return <Badge variant="outline">{reason}</Badge>;
    }
  }

  if (loading) return <div>Cargando movimientos...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Movimientos de Inventario</CardTitle>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Movimiento
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Almacén</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay movimientos registrados
                </TableCell>
              </TableRow>
            ) : (
              movements.map((movement) => (
                <TableRow key={`${movement.type}-${movement.id}`}>
                  <TableCell>
                    {format(new Date(movement.created_at), 'dd MMM HH:mm', { locale: es })}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{movement.product_name || 'Desconocido'}</div>
                    <div className="text-xs text-muted-foreground">{movement.product_sku}</div>
                  </TableCell>
                  <TableCell>
                    {movement.type === 'transfer' ? (
                      <div className="flex items-center gap-1 text-sm">
                        <span>{movement.warehouse_name}</span>
                        <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                        <span>{movement.to_warehouse_name}</span>
                      </div>
                    ) : (
                      <span>{movement.warehouse_name || '-'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={movement.quantity_change > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
                    </span>
                  </TableCell>
                  <TableCell>{getReasonBadge(movement.reason, movement.type)}</TableCell>
                  <TableCell className="text-right">
                    {movement.type !== 'sale' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setMovementToDelete(movement)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <InventoryMovementDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        onSuccess={loadMovements}
      />

      <AlertDialog open={!!movementToDelete} onOpenChange={(open) => !open && setMovementToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción revertirá el cambio de stock asociado. 
              {movementToDelete?.type === 'transfer' 
                ? ' Se devolverá el stock al almacén de origen y se restará del destino.' 
                : ' El stock se ajustará inversamente a este movimiento.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
