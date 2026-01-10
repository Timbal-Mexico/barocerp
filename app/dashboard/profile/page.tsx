'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setFullName(data.full_name || '');
        setAvatarUrl(data.avatar_url || '');
        setRole(data.role || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      loadProfile();
      setEmail(user.email || '');
    }
  }, [user, loadProfile]);

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          full_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success('Perfil actualizado correctamente', {
        style: {
          background: '#10B981',
          color: 'white',
          border: 'none',
        }
      });
    } catch (error: any) {
      toast.error('Error al actualizar perfil: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateEmail(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      toast.success('Se ha enviado un correo de confirmación a tu nueva dirección', {
        style: {
          background: '#10B981',
          color: 'white',
          border: 'none',
        }
      });
    } catch (error: any) {
      toast.error('Error al actualizar email: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Contraseña actualizada correctamente', {
        style: {
          background: '#10B981',
          color: 'white',
          border: 'none',
        }
      });
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error('Error al actualizar contraseña: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Cargando perfil...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Mi Perfil</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
            <CardDescription>Actualiza tus datos personales</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={updateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label>Rol Actual</Label>
                <div className="p-2 bg-slate-100 rounded-md capitalize font-medium">
                  {role || 'Sin rol asignado'}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre Completo</Label>
                <Input 
                  id="fullName" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatarUrl">URL de Avatar</Label>
                <Input 
                  id="avatarUrl" 
                  value={avatarUrl} 
                  onChange={(e) => setAvatarUrl(e.target.value)} 
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seguridad</CardTitle>
            <CardDescription>Gestiona tu cuenta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={updateEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </div>
              <Button type="submit" variant="outline" disabled={saving}>
                Actualizar Correo
              </Button>
            </form>

            <div className="border-t pt-4">
              <form onSubmit={updatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nueva Contraseña</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                  />
                </div>
                <Button type="submit" variant="outline" disabled={saving}>
                  Cambiar Contraseña
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
