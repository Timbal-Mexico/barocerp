CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_warehouse_id uuid NOT NULL REFERENCES public.product_warehouses(id),
  adjustment_quantity integer NOT NULL,
  reason text NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz
);

ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_adjustments' AND policyname = 'Enable select for authenticated') THEN
    CREATE POLICY "Enable select for authenticated" ON public.inventory_adjustments FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_adjustments' AND policyname = 'Enable insert for authenticated') THEN
    CREATE POLICY "Enable insert for authenticated" ON public.inventory_adjustments FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_adjustments' AND policyname = 'Enable update for authenticated') THEN
    CREATE POLICY "Enable update for authenticated" ON public.inventory_adjustments FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_adjustments' AND policyname = 'Enable delete for authenticated') THEN
    CREATE POLICY "Enable delete for authenticated" ON public.inventory_adjustments FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_transfers' AND policyname = 'Enable select for authenticated') THEN
    CREATE POLICY "Enable select for authenticated" ON public.inventory_transfers FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_transfers' AND policyname = 'Enable insert for authenticated') THEN
    CREATE POLICY "Enable insert for authenticated" ON public.inventory_transfers FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_transfers' AND policyname = 'Enable update for authenticated') THEN
    CREATE POLICY "Enable update for authenticated" ON public.inventory_transfers FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_transfers' AND policyname = 'Enable delete for authenticated') THEN
    CREATE POLICY "Enable delete for authenticated" ON public.inventory_transfers FOR DELETE TO authenticated USING (true);
  END IF;
END $$;
