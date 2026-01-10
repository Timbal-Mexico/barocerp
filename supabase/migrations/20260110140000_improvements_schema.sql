-- Migration: 20260110140000_improvements_schema.sql

-- 1. Create profiles table with roles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'sales' CHECK (role IN ('admin', 'sales', 'manager', 'warehouse', 'supplier')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'sales')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Add discount to sale_items
ALTER TABLE sale_items 
  ADD COLUMN IF NOT EXISTS discount numeric(10,2) DEFAULT 0 CHECK (discount >= 0);

-- 3. Add brand to products
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS brand text;

-- 4. Add security: Only admin can create users (via RLS or App Logic, here we prepare RLS)
-- Note: Supabase Auth is handled separately, but we can restrict profile creation/updates via RLS if we used a custom user management system.
-- For now, the requirement "Solo el administrador puede crear cuentas" implies we should disable open sign up in Supabase Dashboard (manual step)
-- or enforce it via Edge Functions.
-- However, we can enforce that only Admins can assign roles other than 'sales'.

CREATE OR REPLACE FUNCTION check_role_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is being changed
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Check if the user performing the update is an admin
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only admins can change user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_role_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION check_role_assignment();
