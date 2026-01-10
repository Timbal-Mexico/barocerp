'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, TrendingUp, Target, Pencil, History, Trash2 } from 'lucide-react';
import { CreateGoalDialog } from '@/components/dashboard/create-goal-dialog';
import { EditGoalDialog } from '@/components/dashboard/edit-goal-dialog';
import { GoalHistoryDialog } from '@/components/dashboard/goal-history-dialog';

type Goal = {
  id: string;
  month: string;
  target_amount: number;
  channel: string | null;
  created_at: string;
};

type GoalWithProgress = Goal & {
  current_amount: number;
  percentage: number;
  sales_count: number;
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [historyGoalId, setHistoryGoalId] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  useEffect(() => {
    loadGoals();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este objetivo?')) return;
    
    try {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
      loadGoals();
    } catch (error: any) {
      console.error('Error deleting goal:', error);
      alert('Error al eliminar: ' + error.message);
    }
  }

  async function loadGoals() {
    try {
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .order('month', { ascending: false });

      if (goalsError) throw goalsError;

      const goalsWithProgress = await Promise.all(
        (goalsData || []).map(async (goal) => {
          const monthStart = new Date(goal.month + '-01');
          const monthEnd = new Date(
            monthStart.getFullYear(),
            monthStart.getMonth() + 1,
            0,
            23,
            59,
            59
          );

          const query = supabase
            .from('sales')
            .select('total_amount')
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString());

          if (goal.channel && goal.channel !== 'all') {
            query.eq('channel', goal.channel);
          }

          const { data: salesData } = await query;

          const currentAmount = salesData?.reduce(
            (sum, sale) => sum + Number(sale.total_amount),
            0
          ) || 0;

          return {
            ...goal,
            current_amount: currentAmount,
            percentage: (currentAmount / Number(goal.target_amount)) * 100,
            sales_count: salesData?.length || 0,
          };
        })
      );

      setGoals(goalsWithProgress);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Cargando objetivos...</div>;
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthGoals = goals.filter((g) => g.month === currentMonth);
  const totalTarget = currentMonthGoals.reduce(
    (sum, g) => sum + Number(g.target_amount),
    0
  );
  const totalCurrent = currentMonthGoals.reduce(
    (sum, g) => sum + g.current_amount,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Objetivos</h1>
          <p className="text-slate-500 mt-1">
            Define y rastrea tus metas mensuales de ventas
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Objetivo
        </Button>
      </div>

      {currentMonthGoals.length > 0 && (
        <Card className="bg-slate-900 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Resumen del Mes Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-lg">Progreso Total</span>
              <span className="text-2xl font-bold">
                ${totalCurrent.toFixed(2)} / ${totalTarget.toFixed(2)}
              </span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all"
                style={{
                  width: `${Math.min((totalCurrent / totalTarget) * 100, 100)}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>
                {((totalCurrent / totalTarget) * 100).toFixed(1)}% completado
              </span>
              {totalCurrent >= totalTarget ? (
                <span className="text-green-400 font-medium">
                  Objetivo alcanzado
                </span>
              ) : (
                <span>
                  Falta ${(totalTarget - totalCurrent).toFixed(2)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {goals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              No hay objetivos creados. Crea tu primer objetivo para comenzar a
              rastrear tu progreso.
            </CardContent>
          </Card>
        ) : (
          goals.map((goal) => {
            const isCurrentMonth = goal.month === currentMonth;
            const isPastMonth = goal.month < currentMonth;
            const isAchieved = goal.current_amount >= Number(goal.target_amount);

            return (
              <Card key={goal.id} className={isPastMonth ? 'opacity-75' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span>
                          {new Date(goal.month + '-01').toLocaleDateString('es-ES', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        {isCurrentMonth && (
                          <span className="text-xs bg-slate-900 text-white px-2 py-1 rounded">
                            Mes actual
                          </span>
                        )}
                        {isAchieved && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Alcanzado
                          </span>
                        )}
                      </CardTitle>
                      <p className="text-sm text-slate-500 mt-1">
                        Canal:{' '}
                        <span className="capitalize font-medium">
                          {goal.channel === 'all' ? 'Todos' : goal.channel || 'Todos'}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingGoal(goal);
                          setShowEditDialog(true);
                        }}
                      >
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setHistoryGoalId(goal.id);
                          setShowHistoryDialog(true);
                        }}
                      >
                        <History className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(goal.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Objetivo</span>
                    <span className="text-lg font-semibold">
                      ${Number(goal.target_amount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Alcanzado</span>
                    <span className="text-lg font-semibold">
                      ${goal.current_amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isAchieved
                          ? 'bg-green-600'
                          : goal.percentage > 75
                          ? 'bg-slate-900'
                          : 'bg-slate-600'
                      }`}
                      style={{
                        width: `${Math.min(goal.percentage, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{goal.percentage.toFixed(1)}% completado</span>
                    <span>{goal.sales_count} ventas</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <CreateGoalDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={loadGoals}
      />

      <EditGoalDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={loadGoals}
        goal={editingGoal}
      />

      <GoalHistoryDialog
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
        goalId={historyGoalId}
      />
    </div>
  );
}
