'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type AuditLog = {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values: any;
  new_values: any;
  changed_by: string;
  created_at: string;
  user_profile?: {
    name: string;
    lastname: string;
    email: string;
  };
};

type UserProfile = {
  auth_user_id: string;
  name: string;
  lastname: string;
  email: string;
};

const ITEMS_PER_PAGE = 20;

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  // Filters
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('auth_user_id, name, lastname, email');
    if (data) setUsers(data);
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' });

      // Apply filters
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }
      if (userFilter !== 'all') {
        query = query.eq('changed_by', userFilter);
      }
      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        // Add one day to include the end date fully
        const nextDay = new Date(dateTo);
        nextDay.setDate(nextDay.getDate() + 1);
        query = query.lt('created_at', nextDay.toISOString());
      }

      // Pagination
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data) {
        // Fetch user profiles for the logs
        const userIds = Array.from(new Set(data.map(log => log.changed_by)));
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('auth_user_id, name, lastname, email')
          .in('auth_user_id', userIds);

        const enrichedLogs = data.map(log => ({
          ...log,
          user_profile: profiles?.find(p => p.auth_user_id === log.changed_by)
        }));

        setLogs(enrichedLogs);
        setTotalCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, userFilter, dateFrom, dateTo, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Historial de Acciones</h1>
        <p className="text-slate-500 mt-1">
          Registro detallado de cambios y actividades en el sistema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Refina la búsqueda de registros.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Acción</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="INSERT">Creación (INSERT)</SelectItem>
                  <SelectItem value="UPDATE">Actualización (UPDATE)</SelectItem>
                  <SelectItem value="DELETE">Eliminación (DELETE)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Usuario</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los usuarios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los usuarios</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.auth_user_id} value={u.auth_user_id}>
                      {u.name} {u.lastname} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Desde</Label>
              <Input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Tabla</TableHead>
                <TableHead>Detalles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                    No se encontraron registros.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {log.user_profile ? `${log.user_profile.name} ${log.user_profile.lastname}` : 'Usuario desconocido'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {log.user_profile?.email || log.changed_by}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        log.action === 'INSERT' ? 'default' : 
                        log.action === 'UPDATE' ? 'secondary' : 'destructive'
                      }>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{log.table_name}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Detalles del registro</DialogTitle>
                            <DialogDescription>
                              ID: {log.id} | Record ID: {log.record_id}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <h4 className="font-medium mb-2 text-red-500">Valor Anterior</h4>
                              <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg overflow-auto text-xs h-64">
                                {JSON.stringify(log.old_values, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2 text-green-500">Valor Nuevo</h4>
                              <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg overflow-auto text-xs h-64">
                                {JSON.stringify(log.new_values, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          Mostrando {((page - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(page * ITEMS_PER_PAGE, totalCount)} de {totalCount} registros
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            Siguiente
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
