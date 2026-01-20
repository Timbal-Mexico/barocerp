DO $$
BEGIN
  IF to_regclass('public.inventory_transfers') IS NULL THEN
    IF to_regclass('inventory_transfers.inventory_transfers') IS NOT NULL THEN
      ALTER TABLE inventory_transfers.inventory_transfers SET SCHEMA public;
    ELSE
      CREATE TABLE public.inventory_transfers (
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
      ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;
      CREATE INDEX IF NOT EXISTS idx_inventory_transfers_status ON public.inventory_transfers(status);
      CREATE POLICY "Users can view transfers" ON public.inventory_transfers FOR SELECT TO authenticated USING (true);
      CREATE POLICY "Users can create transfers" ON public.inventory_transfers FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "Users can update transfers" ON public.inventory_transfers FOR UPDATE TO authenticated USING (true);
      CREATE POLICY "Users can delete transfers" ON public.inventory_transfers FOR DELETE TO authenticated USING (true);
      DROP TRIGGER IF EXISTS process_transfer ON public.inventory_transfers;
      CREATE TRIGGER process_transfer
        BEFORE UPDATE ON public.inventory_transfers
        FOR EACH ROW EXECUTE FUNCTION inventory_transfers.process_inventory_transfer();
      DROP TRIGGER IF EXISTS reverse_inventory_transfer_trigger ON public.inventory_transfers;
      CREATE TRIGGER reverse_inventory_transfer_trigger
        AFTER DELETE ON public.inventory_transfers
        FOR EACH ROW EXECUTE FUNCTION inventory_transfers.reverse_inventory_transfer();
    END IF;
  END IF;
END $$;
