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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

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
    agent_id: '',
    type: 'global',
  });
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    if (open) {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const currentMonth = `${now.getFullYear()}-${month}`;
      setFormData({
        month: currentMonth,
        target_amount: '',
        channel: 'all',
        agent_id: '',
        type: 'global',
      });
      loadProfiles();
    }
  }, [open]);

  async function loadProfiles() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name');
    setProfiles(data || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        month: formData.month,
        target_amount: parseFloat(formData.target_amount),
      };

      if (formData.type === 'agent') {
        if (!formData.agent_id) {
          throw new Error('Debes seleccionar un agente');
        }
        payload.agent_id = formData.agent_id;
        payload.channel = null; // Agent goals are channel-agnostic for now
      } else {
        payload.channel = formData.channel;
        payload.agent_id = null;
      }

      const { error } = await supabase.from('goals').insert(payload);

      if (error) throw error;

      onSuccess();
      onOpenChange(false);
      toast.success('Objetivo creado correctamente', {
        style: {
          background: '#10B981',
          color: 'white',
          border: 'none',
        }
      });
    } catch (error: any) {
      console.error('Error creating goal:', error);
      if (error.code === '23505') {
        toast.error('Ya existe un objetivo para este mes y canal/agente');
      } else {
        toast.error('Error al crear el objetivo: ' + error.message);
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
            Define un objetivo mensual de ventas global o por agente
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
            <Label>Tipo de Objetivo</Label>
            <RadioGroup
              value={formData.type}
              onValueChange={(val) => setFormData({ ...formData, type: val })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="global" id="global" />
                <Label htmlFor="global">Global / Canal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="agent" id="agent" />
                <Label htmlFor="agent">Por Agente</Label>
              </div>
            </RadioGroup>
          </div>

          {formData.type === 'global' ? (
            <div className="space-y-2">
              <Label htmlFor="channel">Canal</Label>
              <Select
                value={formData.channel}
                onValueChange={(val) =>
                  setFormData({ ...formData, channel: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los canales</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="web">Web / E-commerce</SelectItem>
                  <SelectItem value="organico">Orgánico / Referido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="agent">Agente *</Label>
              <Select
                value={formData.agent_id}
                onValueChange={(val) =>
                  setFormData({ ...formData, agent_id: val })
                }
                disabled={profiles.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={profiles.length === 0 ? "No hay agentes disponibles" : "Selecciona un agente"} />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || profile.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {profiles.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No se encontraron agentes. Crea usuarios en la sección de perfiles.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="target">Monto Objetivo ($) *</Label>
            <Input
              id="target"
              type="number"
              min="0"
              step="0.01"
              value={formData.target_amount}
              onChange={(e) =>
                setFormData({ ...formData, target_amount: e.target.value })
              }
              placeholder="0.00"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Objetivo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
