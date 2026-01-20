-- View for unified movements
CREATE OR REPLACE VIEW unified_inventory_movements AS
SELECT
    m.id,
    m.created_at,
    m.reason,
    m.quantity as quantity_change,
    'sale' as type,
    m.product_id,
    NULL::uuid as warehouse_id,
    NULL::uuid as to_warehouse_id,
    p.name as product_name,
    p.sku as product_sku,
    NULL as warehouse_name,
    NULL as to_warehouse_name
FROM public.inventory_movements m
LEFT JOIN public.products p ON m.product_id = p.id
UNION ALL
SELECT
    ia.id,
    ia.created_at,
    ia.reason,
    ia.adjustment_quantity as quantity_change,
    'adjustment' as type,
    pw.product_id,
    pw.warehouse_id,
    NULL::uuid as to_warehouse_id,
    p.name as product_name,
    p.sku as product_sku,
    w.name as warehouse_name,
    NULL as to_warehouse_name
FROM public.inventory_adjustments ia
JOIN public.product_warehouses pw ON ia.product_warehouse_id = pw.id
JOIN public.products p ON pw.product_id = p.id
JOIN public.warehouses w ON pw.warehouse_id = w.id
UNION ALL
SELECT
    it.id,
    it.created_at,
    it.reason,
    it.quantity as quantity_change,
    'transfer' as type,
    pw_from.product_id,
    pw_from.warehouse_id as warehouse_id,
    pw_to.warehouse_id as to_warehouse_id,
    p.name as product_name,
    p.sku as product_sku,
    w_from.name as warehouse_name,
    w_to.name as to_warehouse_name
FROM public.inventory_transfers it
JOIN public.product_warehouses pw_from ON it.from_product_warehouse_id = pw_from.id
JOIN public.product_warehouses pw_to ON it.to_product_warehouse_id = pw_to.id
JOIN public.products p ON pw_from.product_id = p.id
JOIN public.warehouses w_from ON pw_from.warehouse_id = w_from.id
JOIN public.warehouses w_to ON pw_to.warehouse_id = w_to.id;

-- Function to reverse inventory adjustment on DELETE
CREATE OR REPLACE FUNCTION reverse_inventory_adjustment()
RETURNS TRIGGER AS $$
BEGIN
    -- Reverse the quantity change
    -- If adjustment was +10 (Add), we subtract 10.
    -- If adjustment was -5 (Remove), we add 5 (subtract -5).
UPDATE public.product_warehouses
    SET quantity = quantity - OLD.adjustment_quantity,
        last_updated_at = now(),
        last_updated_by = auth.uid()
    WHERE id = OLD.product_warehouse_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reverse_inventory_adjustment_trigger ON inventory_adjustments;
CREATE TRIGGER reverse_inventory_adjustment_trigger
AFTER DELETE ON inventory_adjustments
FOR EACH ROW EXECUTE FUNCTION reverse_inventory_adjustment();

-- Function to reverse inventory transfer on DELETE
CREATE OR REPLACE FUNCTION reverse_inventory_transfer()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'completed' THEN
        -- Add back to source (because transfer deducted from source)
        UPDATE product_warehouses
        SET quantity = quantity + OLD.quantity,
            last_updated_at = now(),
            last_updated_by = auth.uid()
        WHERE id = OLD.from_product_warehouse_id;

        -- Remove from destination (because transfer added to destination)
        UPDATE product_warehouses
        SET quantity = quantity - OLD.quantity,
            last_updated_at = now(),
            last_updated_by = auth.uid()
        WHERE id = OLD.to_product_warehouse_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reverse_inventory_transfer_trigger ON inventory_transfers;
CREATE TRIGGER reverse_inventory_transfer_trigger
AFTER DELETE ON inventory_transfers
FOR EACH ROW EXECUTE FUNCTION reverse_inventory_transfer();

-- Enable RLS for Delete operations
CREATE POLICY "Users can delete adjustments" ON public.inventory_adjustments
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can delete transfers" ON public.inventory_transfers
  FOR DELETE TO authenticated USING (true);
