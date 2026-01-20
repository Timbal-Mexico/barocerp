ALTER TABLE public.product_warehouses ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_warehouses' AND policyname='allow_authenticated_select_pw') THEN
    CREATE POLICY "allow_authenticated_select_pw" ON public.product_warehouses FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_warehouses' AND policyname='allow_authenticated_write_pw') THEN
    CREATE POLICY "allow_authenticated_write_pw" ON public.product_warehouses FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
