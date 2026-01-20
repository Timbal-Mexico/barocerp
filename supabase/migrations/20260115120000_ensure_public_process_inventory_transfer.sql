-- Ensure public.process_inventory_transfer exists for triggers that reference it

CREATE OR REPLACE FUNCTION public.process_inventory_transfer()
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

