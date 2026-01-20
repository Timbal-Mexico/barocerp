-- Archivos, facturas, tickets y chat

-- 1. Tabla de archivos (metadatos de ficheros en Supabase Storage)
CREATE TABLE IF NOT EXISTS public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  bucket text NOT NULL DEFAULT 'erpcommerce',
  path text NOT NULL,
  mime_type text,
  size bigint,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files(created_at DESC);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'files' 
      AND policyname = 'Allow authenticated read files'
  ) THEN
    CREATE POLICY "Allow authenticated read files"
      ON public.files FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'files' 
      AND policyname = 'Allow authenticated insert files'
  ) THEN
    CREATE POLICY "Allow authenticated insert files"
      ON public.files FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'files' 
      AND policyname = 'Allow authenticated update files'
  ) THEN
    CREATE POLICY "Allow authenticated update files"
      ON public.files FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'files' 
      AND policyname = 'Allow authenticated delete files'
  ) THEN
    CREATE POLICY "Allow authenticated delete files"
      ON public.files FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 2. Tabla de facturas
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  issue_date timestamptz DEFAULT now(),
  due_date timestamptz,
  currency text NOT NULL DEFAULT 'MXN',
  subtotal numeric(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax numeric(10,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total numeric(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('draft','issued','paid','cancelled')),
  billing_name text,
  billing_address text,
  tax_id text,
  notes text,
  pdf_path text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_sale_id ON public.invoices(sale_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'invoices' 
      AND policyname = 'Allow authenticated read invoices'
  ) THEN
    CREATE POLICY "Allow authenticated read invoices"
      ON public.invoices FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'invoices' 
      AND policyname = 'Allow authenticated insert invoices'
  ) THEN
    CREATE POLICY "Allow authenticated insert invoices"
      ON public.invoices FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'invoices' 
      AND policyname = 'Allow authenticated update invoices'
  ) THEN
    CREATE POLICY "Allow authenticated update invoices"
      ON public.invoices FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'invoices' 
      AND policyname = 'Allow authenticated delete invoices'
  ) THEN
    CREATE POLICY "Allow authenticated delete invoices"
      ON public.invoices FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 3. Sistema de tickets
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  created_by uuid REFERENCES auth.users(id),
  assigned_to uuid REFERENCES auth.users(id),
  related_sale_id uuid REFERENCES public.sales(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON public.tickets(created_by);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'tickets' 
      AND policyname = 'Allow authenticated read tickets'
  ) THEN
    CREATE POLICY "Allow authenticated read tickets"
      ON public.tickets FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'tickets' 
      AND policyname = 'Allow authenticated insert tickets'
  ) THEN
    CREATE POLICY "Allow authenticated insert tickets"
      ON public.tickets FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'tickets' 
      AND policyname = 'Allow authenticated update tickets'
  ) THEN
    CREATE POLICY "Allow authenticated update tickets"
      ON public.tickets FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'tickets' 
      AND policyname = 'Allow authenticated delete tickets'
  ) THEN
    CREATE POLICY "Allow authenticated delete tickets"
      ON public.tickets FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 4. Mensajes de tickets (chat en tiempo real)
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id),
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON public.ticket_messages(created_at DESC);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'ticket_messages' 
      AND policyname = 'Allow authenticated read ticket_messages'
  ) THEN
    CREATE POLICY "Allow authenticated read ticket_messages"
      ON public.ticket_messages FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'ticket_messages' 
      AND policyname = 'Allow authenticated insert ticket_messages'
  ) THEN
    CREATE POLICY "Allow authenticated insert ticket_messages"
      ON public.ticket_messages FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'ticket_messages' 
      AND policyname = 'Allow authenticated delete ticket_messages'
  ) THEN
    CREATE POLICY "Allow authenticated delete ticket_messages"
      ON public.ticket_messages FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

