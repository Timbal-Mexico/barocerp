
import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown, BarChart3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

export interface AgentPerformance {
  agentId?: string;
  name: string;
  sales: number;
  goal: number;
  remaining: number;
  percentage: number;
}

interface AgentPerformanceListProps {
  data: AgentPerformance[];
  currencyFormatter: (value: number) => string;
}

type SortField = 'percentage' | 'name' | 'remaining';
type SortOrder = 'asc' | 'desc';

export function AgentPerformanceList({ data, currencyFormatter }: AgentPerformanceListProps) {
  const [sortField, setSortField] = useState<SortField>('percentage');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // Default to desc for new field
    }
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'percentage':
          comparison = a.percentage - b.percentage;
          break;
        case 'remaining':
          comparison = a.remaining - b.remaining;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [data, sortField, sortOrder]);

  const totalSales = data.reduce((sum, item) => sum + item.sales, 0);
  const totalGoal = data.reduce((sum, item) => sum + item.goal, 0);
  const globalPercentage = totalGoal > 0 ? (totalSales / totalGoal) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales Equipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencyFormatter(totalSales)}</div>
            <p className="text-xs text-muted-foreground">
              Objetivo Global: {currencyFormatter(totalGoal)}
            </p>
            <Progress value={Math.min(globalPercentage, 100)} className="mt-3 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {globalPercentage.toFixed(1)}% completado
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Detalle por Agente</h3>
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="chart" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Gráfica
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1 p-0 hover:bg-transparent"
                    >
                      Agente
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Objetivo</TableHead>
                  <TableHead className="text-right">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('remaining')}
                      className="flex items-center gap-1 p-0 hover:bg-transparent w-full justify-end"
                    >
                      Falta
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right w-[250px]">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('percentage')}
                      className="flex items-center gap-1 p-0 hover:bg-transparent w-full justify-end"
                    >
                      Progreso
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((agent) => (
                  <TableRow key={agent.name}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell className="text-right">{currencyFormatter(agent.sales)}</TableCell>
                    <TableCell className="text-right">{currencyFormatter(agent.goal)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {currencyFormatter(Math.max(0, agent.remaining))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col gap-1 w-full max-w-[200px] ml-auto">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">{agent.percentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={Math.min(agent.percentage, 100)} className="h-2.5" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                      No hay datos de agentes disponibles.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle>Comparativa de Rendimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `$${value}`} />
                    <Tooltip 
                      formatter={(value: number) => currencyFormatter(value)}
                      labelStyle={{ color: 'black' }}
                    />
                    <Legend />
                    <Bar dataKey="sales" name="Ventas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="goal" name="Objetivo" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
