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

type Goal = {
  id: string;
  month: string;
  target_amount: number;
  channel: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  goal: Goal | null;
};

export function EditGoalDialog({ open, onOpenChange, onSuccess, goal }: Props) {
  const [formData, setFormData] = useState({
    month: '',
    target_amount: '',
    channel: 'all',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (goal && open) {
      setFormData({
        month: goal.month,
        target_amount: goal.target_amount.toString(),
        channel: goal.channel || 'all',
      });
    }
  }, [goal, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goal) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('goals')
        .update({
          month: formData.month,
          target_amount: parseFloat(formData.target_amount),
          channel: formData.channel,
        })
        .eq('id', goal.id);

      if (error) throw error;

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating goal:', error);
      if (error.code === '23505') {
        alert('Ya existe un objetivo para este mes y canal');
      } else {
        alert('Error al actualizar el objetivo: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Objetivo</DialogTitle>
          <DialogDescription>
            Modifica el objetivo de ventas
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-month">Mes *</Label>
            <Input
              id="edit-month"
              type="month"
              value={formData.month}
              onChange={(e) =>
                setFormData({ ...formData, month: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-target_amount">Monto objetivo *</Label>
            <Input
              id="edit-target_amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.target_amount}
              onChange={(e) =>
                setFormData({ ...formData, target_amount: e.target.value })
              }
              placeholder="10000.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-channel">Canal *</Label>
            <select
              id="edit-channel"
              value={formData.channel}
              onChange={(e) =>
                setFormData({ ...formData, channel: e.target.value })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            >
              <option value="all">Todos los canales</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="web">Web</option>
              <option value="organico">Orgánico</option>
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
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
