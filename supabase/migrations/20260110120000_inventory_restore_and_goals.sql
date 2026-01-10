-- Migration: 20260110120000_inventory_restore_and_goals.sql

-- 0. Create goal_changes table
CREATE TABLE IF NOT EXISTS goal_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  old_target_amount DECIMAL(10, 2),
  new_target_amount DECIMAL(10, 2),
  old_channel TEXT,
  new_channel TEXT,
  changed_at TIMESTAMPTZ DEFAULT now(),
  changed_by UUID REFERENCES auth.users(id),
  reason TEXT
);

-- RLS for goal_changes
ALTER TABLE goal_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view goal changes" ON goal_changes;
CREATE POLICY "Users can view goal changes"
  ON goal_changes FOR SELECT
  USING (auth.role() = 'authenticated');

-- 1. Function to restore inventory when a sale item is deleted
CREATE OR REPLACE FUNCTION restore_inventory_to_warehouse()
RETURNS TRIGGER AS $$
DECLARE
  sale_record RECORD;
BEGIN
  -- Get the sale record to find the warehouse
  SELECT * INTO sale_record FROM sales WHERE id = OLD.sale_id;
  
  -- If sale or warehouse info is missing, we can't restore to specific warehouse.
  IF sale_record IS NULL OR sale_record.warehouse_id IS NULL THEN
    RETURN OLD;
  END IF;

  -- Restore quantity to product_warehouse
  UPDATE product_warehouses
  SET quantity = quantity + OLD.quantity,
      last_updated_at = now(),
      last_updated_by = auth.uid()
  WHERE product_id = OLD.product_id AND warehouse_id = sale_record.warehouse_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to sale_items
-- Use BEFORE DELETE to ensure we can still access the parent sale record in case of CASCADE
DROP TRIGGER IF EXISTS restore_inventory_on_sale_item_delete ON sale_items;
CREATE TRIGGER restore_inventory_on_sale_item_delete
  BEFORE DELETE ON sale_items
  FOR EACH ROW EXECUTE FUNCTION restore_inventory_to_warehouse();


-- 2. Function to log goal changes
CREATE OR REPLACE FUNCTION log_goal_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.target_amount <> NEW.target_amount OR OLD.channel IS DISTINCT FROM NEW.channel THEN
    INSERT INTO goal_changes (
      goal_id,
      old_target_amount,
      new_target_amount,
      old_channel,
      new_channel,
      changed_by,
      changed_at,
      reason
    ) VALUES (
      NEW.id,
      OLD.target_amount,
      NEW.target_amount,
      OLD.channel,
      NEW.channel,
      auth.uid(),
      now(),
      'Update via application'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to goals
DROP TRIGGER IF EXISTS log_goal_update ON goals;
CREATE TRIGGER log_goal_update
  AFTER UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION log_goal_changes();
