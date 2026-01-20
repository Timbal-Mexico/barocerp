-- ============================================
-- Nuevos modelos: companies, user_profiles, project_experiences
-- ============================================

-- 1. Tabla companies
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  phone text,
  email text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (phone IS NULL OR phone ~ '^[+0-9() \\-]{7,20}$'),
  CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
);

-- 2. Tabla user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  name text NOT NULL,
  lastname text NOT NULL,
  email text NOT NULL UNIQUE,
  department text,
  profile_picture text,
  residence_city text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
);

-- 3. Tabla project_experiences
CREATE TABLE IF NOT EXISTS public.project_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  company_name text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (end_date IS NULL OR end_date >= start_date),
  CHECK (status IN ('planned', 'in_progress', 'completed', 'on_hold', 'cancelled'))
);

-- 4. Trigger para impedir edición de name y lastname en user_profiles
CREATE OR REPLACE FUNCTION public.prevent_user_profile_name_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.name IS DISTINCT FROM OLD.name OR NEW.lastname IS DISTINCT FROM OLD.lastname THEN
      RAISE EXCEPTION 'Los campos name y lastname no pueden modificarse después de la creación.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_user_profile_name_change ON public.user_profiles;
CREATE TRIGGER trg_prevent_user_profile_name_change
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_profile_name_change();

-- 5. Habilitar RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_experiences ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS
DO $$
BEGIN
  -- companies: lectura y escritura para usuarios autenticados
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'companies' 
      AND policyname = 'Users can view companies'
  ) THEN
    CREATE POLICY "Users can view companies"
      ON public.companies FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'companies' 
      AND policyname = 'Users can insert companies'
  ) THEN
    CREATE POLICY "Users can insert companies"
      ON public.companies FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'companies' 
      AND policyname = 'Users can update companies'
  ) THEN
    CREATE POLICY "Users can update companies"
      ON public.companies FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  -- user_profiles: sólo el dueño puede ver/editar su perfil
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_profiles' 
      AND policyname = 'Users can view own user_profile'
  ) THEN
    CREATE POLICY "Users can view own user_profile"
      ON public.user_profiles FOR SELECT
      TO authenticated
      USING (auth.uid() = auth_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'user_profiles' 
        AND policyname = 'Users can insert own user_profile'
  ) THEN
    CREATE POLICY "Users can insert own user_profile"
      ON public.user_profiles FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = auth_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'user_profiles' 
        AND policyname = 'Users can update own user_profile'
  ) THEN
    CREATE POLICY "Users can update own user_profile"
      ON public.user_profiles FOR UPDATE
      TO authenticated
      USING (auth.uid() = auth_user_id)
      WITH CHECK (auth.uid() = auth_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'user_profiles' 
        AND policyname = 'Users can delete own user_profile'
  ) THEN
    CREATE POLICY "Users can delete own user_profile"
      ON public.user_profiles FOR DELETE
      TO authenticated
      USING (auth.uid() = auth_user_id);
  END IF;

  -- project_experiences: ligadas al perfil del usuario
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'project_experiences' 
      AND policyname = 'Users can view own project_experiences'
  ) THEN
    CREATE POLICY "Users can view own project_experiences"
      ON public.project_experiences FOR SELECT
      TO authenticated
      USING (
        user_profile_id IN (
          SELECT id FROM public.user_profiles 
          WHERE auth_user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'project_experiences' 
      AND policyname = 'Users can insert own project_experiences'
  ) THEN
    CREATE POLICY "Users can insert own project_experiences"
      ON public.project_experiences FOR INSERT
      TO authenticated
      WITH CHECK (
        user_profile_id IN (
          SELECT id FROM public.user_profiles 
          WHERE auth_user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'project_experiences' 
      AND policyname = 'Users can update own project_experiences'
  ) THEN
    CREATE POLICY "Users can update own project_experiences"
      ON public.project_experiences FOR UPDATE
      TO authenticated
      USING (
        user_profile_id IN (
          SELECT id FROM public.user_profiles 
          WHERE auth_user_id = auth.uid()
        )
      )
      WITH CHECK (
        user_profile_id IN (
          SELECT id FROM public.user_profiles 
          WHERE auth_user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'project_experiences' 
      AND policyname = 'Users can delete own project_experiences'
  ) THEN
    CREATE POLICY "Users can delete own project_experiences"
      ON public.project_experiences FOR DELETE
      TO authenticated
      USING (
        user_profile_id IN (
          SELECT id FROM public.user_profiles 
          WHERE auth_user_id = auth.uid()
        )
      );
  END IF;
END $$;

