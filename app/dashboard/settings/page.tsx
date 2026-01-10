'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCw, Save, Moon, Sun, Laptop } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth-context';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { setTheme, theme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [shopUrl, setShopUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [integrationId, setIntegrationId] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('provider', 'shopify')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setIntegrationId(data.id);
        const config = data.config as any;
        setShopUrl(config.shop_url || '');
        setAccessToken(config.access_token || '');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const config = {
        shop_url: shopUrl,
        access_token: accessToken,
      };

      if (integrationId) {
        const { error } = await supabase
          .from('integrations')
          .update({ config, updated_at: new Date().toISOString() })
          .eq('id', integrationId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('integrations')
          .insert({ provider: 'shopify', config, is_active: true });
        if (error) throw error;
        loadSettings();
      }
      alert('Configuración guardada correctamente');
    } catch (error: any) {
      alert('Error al guardar: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleThemeChange(newTheme: string) {
    setTheme(newTheme);
    if (user) {
      try {
        await supabase
          .from('profiles')
          .upsert({ 
            id: user.id, 
            theme: newTheme,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        toast.success('Tema actualizado correctamente');
      } catch (error) {
        console.error('Error saving theme preference:', error);
      }
    }
  }

  async function handleSync() {
    if (!integrationId) return;
    setSyncing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch('/api/shopify/sync', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error en sincronización');
      toast.success(`Sincronización completada: ${data.message}`);
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>

      <Card>
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
          <CardDescription>
            Personaliza cómo se ve la aplicación en tu dispositivo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            defaultValue={theme}
            onValueChange={handleThemeChange}
            className="grid max-w-md grid-cols-3 gap-8 pt-2"
          >
            <div>
              <Label className="[&:has([data-state=checked])>div]:border-primary">
                <RadioGroupItem value="light" className="sr-only" />
                <div className="items-center rounded-md border-2 border-muted p-1 hover:border-accent">
                  <div className="space-y-2 rounded-sm bg-[#ecedef] p-2">
                    <div className="space-y-2 rounded-md bg-white p-2 shadow-sm">
                      <div className="h-2 w-[80px] rounded-lg bg-[#ecedef]" />
                      <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                    </div>
                    <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                      <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                      <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                    </div>
                    <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                      <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                      <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                    </div>
                  </div>
                </div>
                <span className="block w-full p-2 text-center font-normal">
                  Claro
                </span>
              </Label>
            </div>
            <div>
              <Label className="[&:has([data-state=checked])>div]:border-primary">
                <RadioGroupItem value="dark" className="sr-only" />
                <div className="items-center rounded-md border-2 border-muted bg-popover p-1 hover:bg-accent hover:text-accent-foreground">
                  <div className="space-y-2 rounded-sm bg-slate-950 p-2">
                    <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
                      <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                      <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                    </div>
                    <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                      <div className="h-4 w-4 rounded-full bg-slate-400" />
                      <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                    </div>
                    <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                      <div className="h-4 w-4 rounded-full bg-slate-400" />
                      <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                    </div>
                  </div>
                </div>
                <span className="block w-full p-2 text-center font-normal">
                  Oscuro
                </span>
              </Label>
            </div>
            <div>
              <Label className="[&:has([data-state=checked])>div]:border-primary">
                <RadioGroupItem value="system" className="sr-only" />
                <div className="items-center rounded-md border-2 border-muted bg-popover p-1 hover:bg-accent hover:text-accent-foreground">
                  <div className="space-y-2 rounded-sm bg-slate-300 p-2">
                    <div className="space-y-2 rounded-md bg-slate-600 p-2 shadow-sm">
                      <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                      <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                    </div>
                    <div className="flex items-center space-x-2 rounded-md bg-slate-600 p-2 shadow-sm">
                      <div className="h-4 w-4 rounded-full bg-slate-400" />
                      <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                    </div>
                    <div className="flex items-center space-x-2 rounded-md bg-slate-600 p-2 shadow-sm">
                      <div className="h-4 w-4 rounded-full bg-slate-400" />
                      <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                    </div>
                  </div>
                </div>
                <span className="block w-full p-2 text-center font-normal">
                  Sistema
                </span>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integración Shopify</CardTitle>
          <CardDescription>
            Conecta tu tienda para sincronizar pedidos y productos automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveSettings} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shopUrl">URL de la tienda (ej. mi-tienda.myshopify.com)</Label>
              <Input
                id="shopUrl"
                value={shopUrl}
                onChange={(e) => setShopUrl(e.target.value)}
                placeholder="tienda.myshopify.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">Admin API Access Token</Label>
              <Input
                id="token"
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="shpat_..."
                required
              />
              <p className="text-xs text-slate-500">
                Debes crear una App Personalizada en Shopify y obtener el token con permisos de lectura de Orders y Products.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Configuración
              </Button>
              
              <Button type="button" variant="outline" onClick={handleSync} disabled={syncing || !integrationId}>
                {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Sincronizar Ahora
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
