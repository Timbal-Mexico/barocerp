-- Asegurar que los ajustes actualicen correctamente el stock por almacén

-- 1) Corregir/normalizar la función que aplica el ajuste sobre product_warehouses
CREATE OR REPLACE FUNCTION public.validate_inventory_movement()
RETURNS TRIGGER AS $$
DECLARE
  available_qty integer;
BEGIN
  -- Validar stock solo cuando el ajuste es negativo (salida)
  IF NEW.adjustment_quantity < 0 THEN
    SELECT available_quantity INTO available_qty
    FROM public.product_warehouses
    WHERE id = NEW.product_warehouse_id;

    IF available_qty IS NULL OR available_qty < ABS(NEW.adjustment_quantity) THEN
      RAISE EXCEPTION 'Insufficient stock available. Required: %, Available: %',
        ABS(NEW.adjustment_quantity), available_qty;
    END IF;
  END IF;

  -- Aplicar el ajuste al stock del almacén
  UPDATE public.product_warehouses
  SET quantity = quantity + NEW.adjustment_quantity,
      last_updated_at = now(),
      last_updated_by = auth.uid()
  WHERE id = NEW.product_warehouse_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) Asegurar trigger BEFORE INSERT sobre la tabla pública de ajustes
DROP TRIGGER IF EXISTS validate_inventory_adjustment ON public.inventory_adjustments;
CREATE TRIGGER validate_inventory_adjustment
  BEFORE INSERT ON public.inventory_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.validate_inventory_movement();

-- 3) Asegurar trigger de reversión de ajustes al borrar registros
DROP TRIGGER IF EXISTS reverse_inventory_adjustment_trigger ON public.inventory_adjustments;
CREATE TRIGGER reverse_inventory_adjustment_trigger
  AFTER DELETE ON public.inventory_adjustments
  FOR EACH ROW EXECUTE FUNCTION reverse_inventory_adjustment();

