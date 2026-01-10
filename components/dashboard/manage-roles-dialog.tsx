'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Pencil, Save, X } from 'lucide-react';
import { toast } from 'sonner';

type Role = {
  id: string;
  name: string;
  description: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function ManageRolesDialog({ open, onOpenChange, onSuccess }: Props) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open) {
      loadRoles();
    }
  }, [open]);

  async function loadRoles() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('roles').select('*').order('name');
      if (error) throw error;
      setRoles(data || []);
    } catch (error: any) {
      toast.error('Error al cargar roles: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(role: Role) {
    setEditingId(role.id);
    setEditForm({ name: role.name, description: role.description || '' });
    setIsCreating(false);
  }

  function startCreate() {
    setEditingId('new');
    setEditForm({ name: '', description: '' });
    setIsCreating(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ name: '', description: '' });
    setIsCreating(false);
  }

  async function handleSave() {
    if (!editForm.name) {
      toast.error('El nombre del rol es obligatorio');
      return;
    }

    try {
      if (isCreating) {
        const { error } = await supabase.from('roles').insert({
          name: editForm.name,
          description: editForm.description,
        });
        if (error) throw error;
        toast.success('Rol creado correctamente');
      } else {
        const { error } = await supabase
          .from('roles')
          .update({
            name: editForm.name,
            description: editForm.description,
          })
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Rol actualizado correctamente');
      }
      loadRoles();
      cancelEdit();
    } catch (error: any) {
      toast.error('Error al guardar rol: ' + error.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este rol?')) return;

    try {
      const { error } = await supabase.from('roles').delete().eq('id', id);
      if (error) throw error;
      toast.success('Rol eliminado correctamente');
      loadRoles();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error('Error al eliminar rol: ' + error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gestión de Roles</DialogTitle>
          <DialogDescription>
            Crea, edita y elimina los roles disponibles en el sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={startCreate} disabled={!!editingId}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Rol
            </Button>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editingId === 'new' && (
                  <TableRow>
                    <TableCell>
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Nombre del rol"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="Descripción"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="ghost" onClick={handleSave}>
                          <Save className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={cancelEdit}>
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      {editingId === role.id ? (
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      ) : (
                        role.name
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === role.id ? (
                        <Input
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        />
                      ) : (
                        role.description
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === role.id ? (
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="ghost" onClick={handleSave}>
                            <Save className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={cancelEdit}>
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="ghost" onClick={() => startEdit(role)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(role.id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
