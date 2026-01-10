'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import { ManageRolesDialog } from '@/components/dashboard/manage-roles-dialog';
import { CreateUserDialog } from '@/components/dashboard/create-user-dialog';
import { SyncStatus } from '@/components/ui/sync-status';

type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
};


export default function UsersPage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const [showRolesDialog, setShowRolesDialog] = useState(false);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);

  const loadRoles = useCallback(async () => {
    const { data } = await supabase.from('roles').select('name').order('name');
    if (data) {
      setRoles(data.map(r => r.name));
    }
  }, []);


  const checkRoleAndLoadUsers = useCallback(async () => {
    try {
      // Check current user role
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();
      
      const myRole = myProfile?.role || '';
      setCurrentUserRole(myRole);

      // Load all users
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
      const maxDate =
        (data || [])
          .map((p: any) => p.updated_at || p.created_at)
          .filter(Boolean)
          .map((d: string) => new Date(d).getTime())
          .reduce((a, b) => Math.max(a, b), 0) || Date.now();
      setLastUpdated(new Date(maxDate));
      console.debug('users-load-success', { count: (data || []).length });
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      checkRoleAndLoadUsers();
      loadRoles();
    }
  }, [user, checkRoleAndLoadUsers, loadRoles]);

  async function updateRole(userId: string, newRole: string) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      
      setProfiles(profiles.map(p => 
        p.id === userId ? { ...p, role: newRole } : p
      ));
      toast.success('Rol actualizado correctamente');
    } catch (error: any) {
      toast.error('Error actualizando rol: ' + error.message);
      checkRoleAndLoadUsers();
    }
  }

  if (loading) return <div>Cargando usuarios...</div>;

  return (
    <div className="space-y-6">
      <SyncStatus loading={loading} lastUpdated={lastUpdated} onRefresh={checkRoleAndLoadUsers} />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
        {currentUserRole === 'admin' && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowRolesDialog(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Roles
            </Button>
            <Button onClick={() => setShowCreateUserDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Usuario
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios del Sistema</CardTitle>
          <CardDescription>
            Administra los roles y permisos de los usuarios.
            {currentUserRole !== 'admin' && (
              <span className="text-red-500 block mt-2">
                Solo los administradores pueden cambiar roles.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol Actual</TableHead>
                <TableHead>Fecha Registro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">
                    {profile.full_name || 'Sin nombre'}
                  </TableCell>
                  <TableCell>{profile.email}</TableCell>
                  <TableCell>
                    {currentUserRole === 'admin' ? (
                      <Select
                        value={profile.role}
                        onValueChange={(value) => updateRole(profile.id, value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role} value={role}>
                              <span className="capitalize">{role}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary" className="capitalize">
                        {profile.role}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(profile.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ManageRolesDialog 
        open={showRolesDialog} 
        onOpenChange={setShowRolesDialog} 
        onSuccess={loadRoles}
      />
      <CreateUserDialog 
        open={showCreateUserDialog} 
        onOpenChange={setShowCreateUserDialog} 
        onSuccess={checkRoleAndLoadUsers}
      />
    </div>
  );
}
