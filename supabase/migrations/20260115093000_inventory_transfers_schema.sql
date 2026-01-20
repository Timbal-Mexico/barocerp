CREATE SCHEMA IF NOT EXISTS inventory_transfers;

CREATE TABLE IF NOT EXISTS inventory_transfers.inventory_transfers (
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

CREATE INDEX IF NOT EXISTS idx_inventory_transfers_status ON inventory_transfers.inventory_transfers(status);

ALTER TABLE inventory_transfers.inventory_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transfers" ON inventory_transfers.inventory_transfers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create transfers" ON inventory_transfers.inventory_transfers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update transfers" ON inventory_transfers.inventory_transfers
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete transfers" ON inventory_transfers.inventory_transfers
  FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION inventory_transfers.process_inventory_transfer()
RETURNS TRIGGER AS $$
DECLARE
  from_available integer;
BEGIN
  IF NEW.status = 'completed' THEN
    SELECT available_quantity INTO from_available
    FROM public.product_warehouses
    WHERE id = NEW.from_product_warehouse_id;
    IF from_available IS NULL OR from_available < NEW.quantity THEN
      RAISE EXCEPTION 'Insufficient stock in source warehouse for transfer';
    END IF;
    UPDATE public.product_warehouses
    SET quantity = quantity - NEW.quantity,
        last_updated_at = now(),
        last_updated_by = auth.uid()
    WHERE id = NEW.from_product_warehouse_id;
    UPDATE public.product_warehouses
    SET quantity = quantity + NEW.quantity,
        last_updated_at = now(),
        last_updated_by = auth.uid()
    WHERE id = NEW.to_product_warehouse_id;
    NEW.completed_at := now();
    NEW.completed_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION inventory_transfers.reverse_inventory_transfer()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'completed' THEN
    UPDATE public.product_warehouses
    SET quantity = quantity + OLD.quantity,
        last_updated_at = now(),
        last_updated_by = auth.uid()
    WHERE id = OLD.from_product_warehouse_id;
    UPDATE public.product_warehouses
    SET quantity = quantity - OLD.quantity,
        last_updated_at = now(),
        last_updated_by = auth.uid()
    WHERE id = OLD.to_product_warehouse_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS process_transfer ON inventory_transfers.inventory_transfers;
CREATE TRIGGER process_transfer
  BEFORE UPDATE ON inventory_transfers.inventory_transfers
  FOR EACH ROW EXECUTE FUNCTION inventory_transfers.process_inventory_transfer();

DROP TRIGGER IF EXISTS reverse_inventory_transfer_trigger ON inventory_transfers.inventory_transfers;
CREATE TRIGGER reverse_inventory_transfer_trigger
  AFTER DELETE ON inventory_transfers.inventory_transfers
  FOR EACH ROW EXECUTE FUNCTION inventory_transfers.reverse_inventory_transfer();
