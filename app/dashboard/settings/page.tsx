'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCw, Save } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth-context';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SettingsPage() {
  const { setTheme, theme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [shopUrl, setShopUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [name, setName] = useState('');
  const [lastname, setLastname] = useState('');
  const [department, setDepartment] = useState('');
  const [residenceCity, setResidenceCity] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  
  // Company state
  const [companyName, setCompanyName] = useState('');
  const [companyTaxId, setCompanyTaxId] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [generalNotifications, setGeneralNotifications] = useState(true);
  const [generalSounds, setGeneralSounds] = useState(true);
  const [generalLanguage, setGeneralLanguage] = useState('es-MX');
  const [generalTimezone, setGeneralTimezone] = useState('America/Mexico_City');

  useEffect(() => {
    loadProfile();
    loadCompany();
    loadGeneralSettings();
    loadSettings();
  }, []);

  async function loadProfile() {
    if (!user) return;
    try {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('name, lastname, department, residence_city, email')
        .eq('auth_user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setName((data as any).name || '');
        setLastname((data as any).lastname || '');
        setDepartment((data as any).department || '');
        setResidenceCity((data as any).residence_city || '');
        setCurrentEmail((data as any).email || user.email || '');
      } else {
        setCurrentEmail(user.email || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setProfileLoading(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    // Validation
    const cleanEmail = currentEmail.trim();
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      toast.error('Formato de correo electrónico inválido');
      return;
    }

    try {
      setProfileSaving(true);
      let emailUpdateMessage = '';

      // 1. Update Auth Email if changed
      if (cleanEmail !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: cleanEmail
        });
        
        if (authError) throw authError;
        emailUpdateMessage = ' Se ha enviado un correo de confirmación a tu nueva dirección.';
      }

      // 2. Update User Profile
      const payload = {
        auth_user_id: user.id,
        name: name,
        lastname: lastname,
        department: department,
        residence_city: residenceCity,
        email: cleanEmail,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase.from('user_profiles').upsert(payload, {
        onConflict: 'auth_user_id',
      });

      if (error) {
        if (error.code === '23505') {
             throw new Error('El correo electrónico ya está en uso por otro usuario.');
        }
        if (error.message.includes('user_profiles_email_check')) {
            throw new Error('El formato del correo electrónico es inválido (DB Check).');
        }
        // Handle trigger error for name change if migration not applied
        if (error.message.includes('prevent_user_profile_name_change')) {
            throw new Error('No se puede modificar el nombre (Restricción de sistema).');
        }
        throw error;
      }
      
      toast.success('Perfil actualizado correctamente.' + emailUpdateMessage);
    } catch (error: any) {
      toast.error('Error al actualizar perfil: ' + error.message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function loadCompany() {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setCompanyName((data as any).name || '');
        setCompanyTaxId((data as any).tax_id || '');
        setCompanyEmail((data as any).email || '');
        setCompanyPhone((data as any).phone || '');
        setCompanyAddress((data as any).address || '');
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
    }
  }

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        id: 'singleton',
        name: companyName || null,
        tax_id: companyTaxId || null,
        email: companyEmail || null,
        phone: companyPhone || null,
        address: companyAddress || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('company_settings')
        .upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      toast.success('Perfil de empresa actualizado');
    } catch (error: any) {
      toast.error('Error al guardar empresa: ' + error.message);
    }
  }

  function loadGeneralSettings() {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('erp-general-settings');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed.notifications === 'boolean') {
        setGeneralNotifications(parsed.notifications);
      }
      if (typeof parsed.sounds === 'boolean') {
        setGeneralSounds(parsed.sounds);
      }
      if (typeof parsed.language === 'string') {
        setGeneralLanguage(parsed.language);
      }
      if (typeof parsed.timezone === 'string') {
        setGeneralTimezone(parsed.timezone);
      }
    } catch (error) {
      console.error('Error loading general settings:', error);
    }
  }

  function saveGeneralSettings(next: {
    notifications?: boolean;
    sounds?: boolean;
    language?: string;
    timezone?: string;
  }) {
    const updated = {
      notifications: next.notifications ?? generalNotifications,
      sounds: next.sounds ?? generalSounds,
      language: next.language ?? generalLanguage,
      timezone: next.timezone ?? generalTimezone,
    };
    setGeneralNotifications(updated.notifications);
    setGeneralSounds(updated.sounds);
    setGeneralLanguage(updated.language);
    setGeneralTimezone(updated.timezone);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('erp-general-settings', JSON.stringify(updated));
    }
  }

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
          .from('user_profiles')
          .upsert({ 
            auth_user_id: user.id, 
            theme: newTheme,
            updated_at: new Date().toISOString()
          }, { onConflict: 'auth_user_id' });
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-slate-500 mt-1">
          Administra tu perfil, empresa y preferencias del sistema.
        </p>
      </div>

      <Tabs defaultValue="user" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="user">Perfil de usuario</TabsTrigger>
          <TabsTrigger value="company">Perfil de empresa</TabsTrigger>
          <TabsTrigger value="appearance">Apariencia</TabsTrigger>
          <TabsTrigger value="general">Ajustes generales</TabsTrigger>
          <TabsTrigger value="shopify">Integración Shopify</TabsTrigger>
        </TabsList>

        <TabsContent value="user">
          <Card>
            <CardHeader>
              <CardTitle>Perfil del usuario</CardTitle>
              <CardDescription>
                Información básica de tu cuenta y preferencias personales.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    disabled={profileLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastname">Apellidos</Label>
                  <Input
                    id="lastname"
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    placeholder="Tus apellidos"
                    disabled={profileLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Ej. Ventas, Marketing, Soporte"
                    disabled={profileLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="residenceCity">Ciudad de residencia</Label>
                  <Input
                    id="residenceCity"
                    value={residenceCity}
                    onChange={(e) => setResidenceCity(e.target.value)}
                    placeholder="Ciudad donde resides"
                    disabled={profileLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={currentEmail}
                    onChange={(e) => setCurrentEmail(e.target.value)}
                    disabled={profileLoading}
                  />
                </div>
                <Button type="submit" disabled={profileSaving || profileLoading}>
                  {profileSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Guardar perfil
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Perfil de la empresa</CardTitle>
              <CardDescription>
                Datos fiscales y de contacto de la organización.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveCompany} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nombre fiscal</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Nombre de la empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyTax">RFC / NIF</Label>
                  <Input
                    id="companyTax"
                    value={companyTaxId}
                    onChange={(e) => setCompanyTaxId(e.target.value)}
                    placeholder="RFC o identificador fiscal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Correo de contacto</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="contacto@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Teléfono</Label>
                  <Input
                    id="companyPhone"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="+52 ..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Dirección</Label>
                  <Input
                    id="companyAddress"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="Calle, número, ciudad, país"
                  />
                </div>
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  Guardar empresa
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
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
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Ajustes generales</CardTitle>
              <CardDescription>
                Preferencias de notificaciones, idioma y zona horaria del sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Notificaciones push</div>
                  <div className="text-xs text-slate-500">
                    Recibir avisos cuando haya cambios importantes.
                  </div>
                </div>
                <Switch
                  checked={generalNotifications}
                  onCheckedChange={(checked) =>
                    saveGeneralSettings({ notifications: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Sonido de alertas</div>
                  <div className="text-xs text-slate-500">
                    Reproducir sonidos breves al recibir notificaciones.
                  </div>
                </div>
                <Switch
                  checked={generalSounds}
                  onCheckedChange={(checked) =>
                    saveGeneralSettings({ sounds: checked })
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <Select
                    value={generalLanguage}
                    onValueChange={(value) =>
                      saveGeneralSettings({ language: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es-MX">Español (México)</SelectItem>
                      <SelectItem value="es-ES">Español (España)</SelectItem>
                      <SelectItem value="en-US">Inglés</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Zona horaria</Label>
                  <Select
                    value={generalTimezone}
                    onValueChange={(value) =>
                      saveGeneralSettings({ timezone: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Mexico_City">
                        Ciudad de México
                      </SelectItem>
                      <SelectItem value="America/Monterrey">
                        Monterrey
                      </SelectItem>
                      <SelectItem value="America/Bogota">Bogotá</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shopify">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
