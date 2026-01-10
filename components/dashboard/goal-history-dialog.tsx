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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type GoalChange = {
  id: string;
  old_target_amount: number;
  new_target_amount: number;
  old_channel: string | null;
  new_channel: string | null;
  changed_at: string;
  changed_by: string; // uuid
  reason: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string | null;
};

export function GoalHistoryDialog({ open, onOpenChange, goalId }: Props) {
  const [changes, setChanges] = useState<GoalChange[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (goalId && open) {
      loadHistory(goalId);
    }
  }, [goalId, open]);

  async function loadHistory(id: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('goal_changes')
        .select('*')
        .eq('goal_id', id)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setChanges(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historial de Cambios</DialogTitle>
          <DialogDescription>
            Registro de modificaciones del objetivo
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-4">
          {loading ? (
            <div className="text-center py-4">Cargando historial...</div>
          ) : changes.length === 0 ? (
            <div className="text-center py-4 text-slate-500">
              No hay cambios registrados.
            </div>
          ) : (
            <div className="border rounded-md divide-y">
              {changes.map((change) => (
                <div key={change.id} className="p-3 text-sm">
                  <div className="flex justify-between text-slate-500 mb-1">
                    <span>
                      {format(new Date(change.changed_at), "d 'de' MMM, yyyy HH:mm", {
                        locale: es,
                      })}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">Antes:</span>
                      <div className="text-slate-600">
                        Monto: ${Number(change.old_target_amount).toFixed(2)}
                      </div>
                      <div className="text-slate-600">
                        Canal: {change.old_channel === 'all' ? 'Todos' : change.old_channel || 'Todos'}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Después:</span>
                      <div className="text-slate-900 font-semibold">
                        Monto: ${Number(change.new_target_amount).toFixed(2)}
                      </div>
                      <div className="text-slate-900">
                        Canal: {change.new_channel === 'all' ? 'Todos' : change.new_channel || 'Todos'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
