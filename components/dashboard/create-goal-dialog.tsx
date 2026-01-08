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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function CreateGoalDialog({ open, onOpenChange, onSuccess }: Props) {
  const [formData, setFormData] = useState({
    month: '',
    target_amount: '',
    channel: 'all',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      setFormData({
        month: currentMonth,
        target_amount: '',
        channel: 'all',
      });
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('goals').insert({
        month: formData.month,
        target_amount: parseFloat(formData.target_amount),
        channel: formData.channel,
      });

      if (error) throw error;

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating goal:', error);
      if (error.code === '23505') {
        alert('Ya existe un objetivo para este mes y canal');
      } else {
        alert('Error al crear el objetivo: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Objetivo</DialogTitle>
          <DialogDescription>
            Define un objetivo mensual de ventas para un canal específico o para todos
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="month">Mes *</Label>
            <Input
              id="month"
              type="month"
              value={formData.month}
              onChange={(e) =>
                setFormData({ ...formData, month: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_amount">Monto objetivo *</Label>
            <Input
              id="target_amount"
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
            <Label htmlFor="channel">Canal *</Label>
            <select
              id="channel"
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
              {loading ? 'Creando...' : 'Crear Objetivo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
