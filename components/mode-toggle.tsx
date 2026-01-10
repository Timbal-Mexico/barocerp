'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ModeToggle() {
  const { setTheme, theme } = useTheme();
  const { user } = useAuth();

  // Load theme from Supabase on initial load
  React.useEffect(() => {
    async function loadTheme() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('theme')
          .eq('id', user.id)
          .single();
        
        if (data?.theme && data.theme !== theme) {
          setTheme(data.theme);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    }
    
    loadTheme();
  }, [user, setTheme, theme]);

  const handleThemeChange = async (newTheme: string) => {
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
      } catch (error) {
        console.error('Error saving theme preference:', error);
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-white hover:bg-slate-800">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleThemeChange('light')}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange('dark')}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange('system')}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
