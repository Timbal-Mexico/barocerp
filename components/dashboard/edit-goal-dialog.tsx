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

type Goal = {
  id: string;
  month: string;
  target_amount: number;
  channel: string | null;
  agent_id?: string | null;
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
    agent_id: '',
    type: 'global',
  });
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    async function loadProfiles() {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      setProfiles(data || []);
    }

    if (goal && open) {
      const isAgentGoal = !!goal.agent_id;
      setFormData({
        month: goal.month,
        target_amount: goal.target_amount.toString(),
        channel: goal.channel || 'all',
        agent_id: goal.agent_id || '',
        type: isAgentGoal ? 'agent' : 'global',
      });
      if (isAgentGoal) {
        loadProfiles();
      }
    }
  }, [goal, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goal) return;
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
        payload.channel = null;
      } else {
        payload.channel = formData.channel;
        payload.agent_id = null;
      }

      const { error } = await supabase
        .from('goals')
        .update(payload)
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
            Modifica el objetivo de ventas global o por agente
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
            <Label>Tipo de Objetivo</Label>
            <RadioGroup
              value={formData.type}
              onValueChange={(val) => setFormData({ ...formData, type: val })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="global" id="edit-global" />
                <Label htmlFor="edit-global">Global / Canal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="agent" id="edit-agent" />
                <Label htmlFor="edit-agent">Por Agente</Label>
              </div>
            </RadioGroup>
          </div>

          {formData.type === 'global' ? (
            <div className="space-y-2">
              <Label htmlFor="edit-channel">Canal</Label>
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
              <Label htmlFor="edit-agent">Agente *</Label>
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
            </div>
          )}

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
