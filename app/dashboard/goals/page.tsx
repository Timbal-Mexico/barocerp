'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, TrendingUp, Target, Pencil, History, Trash2 } from 'lucide-react';
import { CreateGoalDialog } from '@/components/dashboard/create-goal-dialog';
import { EditGoalDialog } from '@/components/dashboard/edit-goal-dialog';
import { GoalHistoryDialog } from '@/components/dashboard/goal-history-dialog';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/lib/auth-context';

import { AgentPerformanceList, AgentPerformance } from '@/components/dashboard/goals/agent-performance-list';

type Goal = {
  id: string;
  month: string;
  target_amount: number;
  channel: string | null;
  agent_id?: string | null;
  team_id?: string | null;
  created_at: string;
};

type GoalWithProgress = Goal & {
  current_amount: number;
  percentage: number;
  sales_count: number;
};

type ChartPoint = {
  label: string;
  total: number;
};

function getCurrentMonthKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

function getWeekKey(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const diff = d.getTime() - yearStart.getTime();
  const week = Math.ceil((diff / 86400000 + 1) / 7);
  const year = d.getUTCFullYear();
  return `${year}-S${String(week).padStart(2, '0')}`;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [historyGoalId, setHistoryGoalId] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [chartView, setChartView] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [chartDayData, setChartDayData] = useState<ChartPoint[]>([]);
  const [chartWeekData, setChartWeekData] = useState<ChartPoint[]>([]);
  const [chartMonthData, setChartMonthData] = useState<ChartPoint[]>([]);
  const [chartYearData, setChartYearData] = useState<ChartPoint[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [channelData, setChannelData] = useState<{ channel: string; total: number }[]>([]);
  const [agentChannelData, setAgentChannelData] = useState<Array<Record<string, number | string>>>([]);
  const [channelKeys, setChannelKeys] = useState<string[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<AgentPerformance[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [currentProfileName, setCurrentProfileName] = useState<string>('');

  const { user } = useAuth();

  useEffect(() => {
    loadGoals();
    const channel = supabase
      .channel('goals-sales-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => {
          loadGoals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
            59,
            59
          );

          const query = supabase
            .from('sales')
            .select('total_amount, channel, agent_id, agent_name')
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString());

          if (goal.channel && goal.channel !== 'all') {
            query.eq('channel', goal.channel);
          }

          const { data: salesData } = await query;

          const currentAmount =
            salesData?.reduce(
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

      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(
        now.getFullYear(),
        11,
        31,
        23,
        59,
        59,
        999
      );

      // Fetch profiles for agent name mapping
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, role, team_id');
      const profileMap = new Map(profiles?.map((p: any) => [p.id, p.full_name]) || []);
      const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));

      if (user) {
        const me = profileById.get(user.id);
        if (me) {
          setCurrentUserRole(me.role || '');
          setCurrentProfileId(me.id);
          setCurrentProfileName(me.full_name || '');
        }
      }

      const { data: yearSalesData } = await supabase
        .from('sales')
        .select('total_amount, created_at, agent_name, agent_id, channel')
        .gte('created_at', yearStart.toISOString())
        .lte('created_at', yearEnd.toISOString());

      const dailyMap = new Map<string, number>();
      const weeklyMap = new Map<string, number>();
      const monthlyMap = new Map<string, number>();
      const yearlyMap = new Map<string, number>();
      const agentStats = new Map<string, { sales: number; goal: number; agentId?: string }>();
      const teamStats = new Map<string, { sales: number; goal: number }>();
      const channelTotals = new Map<string, number>();
      const agentChannelTotals = new Map<string, Map<string, number>>();

      const currentMonthKey = getCurrentMonthKey();

      (yearSalesData || []).forEach((sale: any) => {
        const saleDate = new Date(sale.created_at);
        const dateKey = saleDate.toISOString().slice(0, 10);
        const amount = Number(sale.total_amount);

        dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + amount);

        const weekKey = getWeekKey(saleDate);
        weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + amount);

        const monthKey = `${saleDate.getFullYear()}-${String(
          saleDate.getMonth() + 1
        ).padStart(2, '0')}`;
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + amount);

        const yearKey = String(saleDate.getFullYear());
        yearlyMap.set(yearKey, (yearlyMap.get(yearKey) || 0) + amount);

        if (monthKey === currentMonthKey) {
          const channel = sale.channel || 'otros';
          channelTotals.set(channel, (channelTotals.get(channel) || 0) + amount);

          let agentKey = 'Sin agente';
          let agentId = sale.agent_id;

          if (agentId) {
            agentKey = profileMap.get(agentId) || sale.agent_name || 'Agente desconocido';
          } else if (sale.agent_name) {
            agentKey = sale.agent_name;
            const profileEntry = Array.from(profileMap.entries()).find(([_, name]) => name === sale.agent_name);
            if (profileEntry) {
              agentId = profileEntry[0];
            }
          }

          const currentAgent = agentStats.get(agentKey) || { sales: 0, goal: 0, agentId };
          currentAgent.sales += amount;
          if (agentId && !currentAgent.agentId) currentAgent.agentId = agentId;
          agentStats.set(agentKey, currentAgent);

          const agentChannels = agentChannelTotals.get(agentKey) || new Map<string, number>();
          agentChannels.set(channel, (agentChannels.get(channel) || 0) + amount);
          agentChannelTotals.set(agentKey, agentChannels);

          if (agentId) {
            const profile = profileById.get(agentId);
            const teamId = profile?.team_id;
            if (teamId) {
              const teamName = String(teamId);
              const currentTeam = teamStats.get(teamName) || { sales: 0, goal: 0 };
              currentTeam.sales += amount;
              teamStats.set(teamName, currentTeam);
            }
          }
        }
      });

      const currentMonthStr = getCurrentMonthKey();
      const currentMonthGoals = goalsData?.filter((g) => g.month === currentMonthStr) || [];

      currentMonthGoals.forEach((g) => {
        if (g.agent_id) {
          const agentName = profileMap.get(g.agent_id);
          if (agentName) {
            const current = agentStats.get(agentName) || { sales: 0, goal: 0, agentId: g.agent_id };
            current.goal += Number(g.target_amount);
            current.agentId = g.agent_id;
            agentStats.set(agentName, current);
          }
        }
        if (g.team_id) {
          const teamKey = String(g.team_id);
          const currentTeam = teamStats.get(teamKey) || { sales: 0, goal: 0 };
          currentTeam.goal += Number(g.target_amount);
          teamStats.set(teamKey, currentTeam);
        }
      });

      const dailyData: ChartPoint[] = Array.from(dailyMap.entries())
        .filter(([date]) => date.startsWith(currentMonthStr))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, total]) => ({
          label: String(new Date(date).getDate()),
          total,
        }));

      const weekData: ChartPoint[] = Array.from(weeklyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, total]) => ({
          label: week,
          total,
        }));

      const monthData: ChartPoint[] = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monthKey, total]) => {
          const [year, month] = monthKey.split('-').map((v) => parseInt(v, 10));
          const date = new Date(year, month - 1, 1);
          const label = date.toLocaleDateString('es-MX', { month: 'short' });
          return { label, total };
        });

      const yearData: ChartPoint[] = Array.from(yearlyMap.entries())
        .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
        .map(([year, total]) => ({
          label: year,
          total,
        }));

      const agentPerformanceData: AgentPerformance[] = Array.from(agentStats.entries()).map(
        ([name, stats]) => ({
          name,
          sales: stats.sales,
          goal: stats.goal,
          remaining: stats.goal - stats.sales,
          percentage: stats.goal > 0 ? (stats.sales / stats.goal) * 100 : 0,
          agentId: stats.agentId,
        })
      );

      const teamPerformanceData: AgentPerformance[] = Array.from(teamStats.entries()).map(
        ([teamKey, stats]) => ({
          name: teamKey,
          sales: stats.sales,
          goal: stats.goal,
          remaining: stats.goal - stats.sales,
          percentage: stats.goal > 0 ? (stats.sales / stats.goal) * 100 : 0,
        })
      );

      const channelArray = Array.from(channelTotals.entries()).map(([channel, total]) => ({
        channel,
        total,
      }));

      const allChannelKeys = Array.from(
        new Set(
          Array.from(agentChannelTotals.values()).flatMap((m) => Array.from(m.keys()))
        )
      );

      const agentChannelArray = Array.from(agentChannelTotals.entries()).map(
        ([name, channels]) => {
          const base: any = { name };
          allChannelKeys.forEach((ch) => {
            base[ch] = channels.get(ch) || 0;
          });
          return base;
        }
      );

      setChartDayData(dailyData);
      setChartWeekData(weekData);
      setChartMonthData(monthData);
      setChartYearData(yearData);
      setAgentPerformance(agentPerformanceData);
      setTeamPerformance(teamPerformanceData);
      setChannelData(channelArray);
      setAgentChannelData(agentChannelArray);
      setChannelKeys(allChannelKeys);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredAgentPerformance = useMemo(() => {
    if (!currentUserRole || currentUserRole === 'admin' || currentUserRole === 'manager') {
      return agentPerformance;
    }
    if (currentUserRole === 'sales' && currentProfileId) {
      const own = agentPerformance.filter(
        (a) => a.agentId === currentProfileId || a.name === currentProfileName
      );
      if (own.length > 0) return own;
    }
    return agentPerformance;
  }, [agentPerformance, currentUserRole, currentProfileId, currentProfileName]);

  if (loading) {
    return <div>Cargando objetivos...</div>;
  }

  const currentMonth = getCurrentMonthKey();
  const currentMonthGoals = goals.filter((g) => g.month === currentMonth);
  const globalGoals = currentMonthGoals.filter(
    (g) => g.channel === 'all' || g.channel === null
  );

  const totalTarget = globalGoals.reduce(
    (sum, g) => sum + Number(g.target_amount),
    0
  );

  const totalCurrent = globalGoals.reduce(
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
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader className="flex items-center justify-between gap-4">
              <CardTitle>Ventas del periodo seleccionado</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={chartView === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartView('day')}
                >
                  Día
                </Button>
                <Button
                  variant={chartView === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartView('week')}
                >
                  Semana
                </Button>
                <Button
                  variant={chartView === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartView('month')}
                >
                  Mes
                </Button>
                <Button
                  variant={chartView === 'year' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartView('year')}
                >
                  Año
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {chartDayData.length === 0 && chartView === 'day' ? (
                <div className="py-6 text-sm text-slate-500">
                  No hay ventas registradas este mes.
                </div>
              ) : (
                <ChartContainer
                  config={{
                    sales: {
                      label: 'Ventas',
                      color: 'hsl(var(--primary))',
                    },
                  }}
                  className="w-full h-64"
                >
                  <BarChart
                    data={
                      chartView === 'day'
                        ? chartDayData
                        : chartView === 'week'
                        ? chartWeekData
                        : chartView === 'month'
                        ? chartMonthData
                        : chartYearData
                    }
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="total"
                      fill="var(--color-sales)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

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
                    width: `${
                      totalTarget > 0
                        ? Math.min((totalCurrent / totalTarget) * 100, 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>
                  {totalTarget > 0
                    ? `${((totalCurrent / totalTarget) * 100).toFixed(1)}% completado`
                    : 'Sin objetivo definido'}
                </span>
                {totalTarget > 0 && totalCurrent >= totalTarget ? (
                  <span className="text-green-400 font-medium">
                    Objetivo alcanzado
                  </span>
                ) : totalTarget > 0 ? (
                  <span>
                    Falta ${(totalTarget - totalCurrent).toFixed(2)}
                  </span>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {currentMonthGoals.length > 0 && (
        <div className="mt-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Rendimiento por Agente</h2>
            <AgentPerformanceList
              data={filteredAgentPerformance}
              currencyFormatter={(value) =>
                `$${value.toLocaleString('es-MX', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              }
            />
          </div>

          {channelData.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Ventas por canal (global, mes actual)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={channelData}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="channel" />
                        <YAxis tickFormatter={(value) => `$${value}`} />
                        <Tooltip
                          formatter={(value: number) =>
                            `$${value.toLocaleString('es-MX', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          }
                        />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {agentChannelData.length > 0 && channelKeys.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Ventas por canal y agente (mes actual)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={agentChannelData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(value) => `$${value}`} />
                          <Tooltip
                            formatter={(value: number) =>
                              `$${value.toLocaleString('es-MX', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            }
                          />
                          <Legend />
                          {channelKeys.map((key) => (
                            <Bar
                              key={key}
                              dataKey={key}
                              name={key}
                              stackId="channels"
                              radius={[4, 4, 0, 0]}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
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
