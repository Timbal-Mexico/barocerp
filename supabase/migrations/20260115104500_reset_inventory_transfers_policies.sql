-- Ensure table exists in public
CREATE TABLE IF NOT EXISTS public.inventory_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_product_warehouse_id uuid NOT NULL REFERENCES public.product_warehouses(id),
  to_product_warehouse_id uuid NOT NULL REFERENCES public.product_warehouses(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;

-- Reset policies for a clean state
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'inventory_transfers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.inventory_transfers', pol.policyname);
  END LOOP;
END $$;

-- Create permissive policies for authenticated role
CREATE POLICY "allow_authenticated_select_transfers"
  ON public.inventory_transfers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_authenticated_insert_transfers"
  ON public.inventory_transfers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "allow_authenticated_update_transfers"
  ON public.inventory_transfers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_authenticated_delete_transfers"
  ON public.inventory_transfers
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "allow_anon_select_transfers"
  ON public.inventory_transfers
  FOR SELECT
  TO anon
  USING (true);
