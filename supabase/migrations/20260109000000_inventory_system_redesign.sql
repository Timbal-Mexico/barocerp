-- Comprehensive Inventory System Redesign
-- This migration implements all requested functionalities with proper data consistency, audit trails, and user tracking

-- 1. Create product_warehouses junction table for multi-warehouse stock tracking
CREATE TABLE IF NOT EXISTS product_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity integer NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  available_quantity integer GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  last_updated_at timestamptz DEFAULT now(),
  last_updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, warehouse_id)
);

-- 2. Create audit_logs table for tracking all inventory changes
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values jsonb,
  new_values jsonb,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- 3. Create inventory_transfers table for inter-warehouse movements
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_product_warehouse_id uuid NOT NULL REFERENCES product_warehouses(id),
  to_product_warehouse_id uuid NOT NULL REFERENCES product_warehouses(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id)
);

-- 4. Create inventory_adjustments table for manual stock adjustments
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_warehouse_id uuid NOT NULL REFERENCES product_warehouses(id),
  adjustment_quantity integer NOT NULL,
  reason text NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz
);

-- 5. Create goal_changes table for tracking goal modifications
CREATE TABLE IF NOT EXISTS goal_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id),
  old_target_amount numeric(10,2),
  new_target_amount numeric(10,2),
  old_channel text,
  new_channel text,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now(),
  reason text
);

-- 6. Add user tracking columns to existing tables
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_updated_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_updated_at timestamptz DEFAULT now();

ALTER TABLE warehouses
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_updated_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_updated_at timestamptz DEFAULT now();

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES warehouses(id),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 7. Create function to get total stock across all warehouses for a product
CREATE OR REPLACE FUNCTION get_product_total_stock(product_uuid uuid)
RETURNS integer AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(quantity) 
     FROM product_warehouses 
     WHERE product_id = product_uuid), 
    0
  );
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to get available stock across all warehouses for a product
CREATE OR REPLACE FUNCTION get_product_available_stock(product_uuid uuid)
RETURNS integer AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(available_quantity) 
     FROM product_warehouses 
     WHERE product_id = product_uuid), 
    0
  );
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to check if sufficient stock is available
CREATE OR REPLACE FUNCTION check_stock_availability(
  product_uuid uuid,
  warehouse_uuid uuid,
  required_quantity integer
)
RETURNS boolean AS $$
DECLARE
  available_qty integer;
BEGIN
  SELECT available_quantity INTO available_qty
  FROM product_warehouses
  WHERE product_id = product_uuid AND warehouse_id = warehouse_uuid;
  
  IF available_qty IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN available_qty >= required_quantity;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger function for audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  audit_data jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    audit_data := jsonb_build_object(
      'table', TG_TABLE_NAME,
      'record_id', OLD.id,
      'action', TG_OP,
      'old_values', to_jsonb(OLD)
    );
    INSERT INTO audit_logs (table_name, record_id, action, old_values, changed_by, changed_at)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), auth.uid(), now());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    audit_data := jsonb_build_object(
      'table', TG_TABLE_NAME,
      'record_id', NEW.id,
      'action', TG_OP,
      'old_values', to_jsonb(OLD),
      'new_values', to_jsonb(NEW)
    );
    INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by, changed_at)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid(), now());
    
    -- Update last_updated_at and last_updated_by
    IF TG_TABLE_NAME IN ('products', 'warehouses', 'product_warehouses') THEN
      NEW.last_updated_at := now();
      NEW.last_updated_by := auth.uid();
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    audit_data := jsonb_build_object(
      'table', TG_TABLE_NAME,
      'record_id', NEW.id,
      'action', TG_OP,
      'new_values', to_jsonb(NEW)
    );
    INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by, changed_at)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW), auth.uid(), now());
    
    -- Set created_by for new records
    IF TG_TABLE_NAME IN ('products', 'warehouses', 'product_warehouses') THEN
      NEW.created_by := auth.uid();
      NEW.last_updated_by := auth.uid();
    END IF;
    
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger function for inventory movement validation
CREATE OR REPLACE FUNCTION validate_inventory_movement()
RETURNS TRIGGER AS $$
DECLARE
  available_qty integer;
BEGIN
  -- Check if sufficient stock is available for negative movements
  IF NEW.quantity < 0 THEN
    SELECT available_quantity INTO available_qty
    FROM product_warehouses
    WHERE id = NEW.product_warehouse_id;
    
    IF available_qty IS NULL OR available_qty < ABS(NEW.quantity) THEN
      RAISE EXCEPTION 'Insufficient stock available. Required: %, Available: %', ABS(NEW.quantity), available_qty;
    END IF;
  END IF;
  
  -- Update the product_warehouse quantity
  UPDATE product_warehouses
  SET quantity = quantity + NEW.adjustment_quantity,
      last_updated_at = now(),
      last_updated_by = auth.uid()
  WHERE id = NEW.product_warehouse_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create trigger function for sales inventory deduction
CREATE OR REPLACE FUNCTION deduct_inventory_from_warehouse()
RETURNS TRIGGER AS $$
DECLARE
  product_warehouse_record RECORD;
  available_qty integer;
BEGIN
  -- Get the product_warehouse record for the sale's warehouse
  SELECT * INTO product_warehouse_record
  FROM product_warehouses
  WHERE product_id = NEW.product_id AND warehouse_id = (SELECT warehouse_id FROM sales WHERE id = NEW.sale_id);
  
  IF product_warehouse_record IS NULL THEN
    RAISE EXCEPTION 'Product not found in specified warehouse';
  END IF;
  
  -- Check if sufficient stock is available
  IF product_warehouse_record.available_quantity < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock in warehouse. Required: %, Available: %', 
                    NEW.quantity, product_warehouse_record.available_quantity;
  END IF;
  
  -- Deduct the quantity from product_warehouse
  UPDATE product_warehouses
  SET quantity = quantity - NEW.quantity,
      last_updated_at = now(),
      last_updated_by = auth.uid()
  WHERE id = product_warehouse_record.id;
  
  -- Create inventory movement record
  INSERT INTO inventory_movements (product_id, quantity, reason, created_at)
  VALUES (NEW.product_id, -NEW.quantity, 'sale', now());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Create trigger function for inventory transfers
CREATE OR REPLACE FUNCTION process_inventory_transfer()
RETURNS TRIGGER AS $$
DECLARE
  from_available integer;
  to_available integer;
BEGIN
  IF NEW.status = 'completed' THEN
    -- Check if sufficient stock is available in source warehouse
    SELECT available_quantity INTO from_available
    FROM product_warehouses
    WHERE id = NEW.from_product_warehouse_id;
    
    IF from_available < NEW.quantity THEN
      RAISE EXCEPTION 'Insufficient stock in source warehouse for transfer';
    END IF;
    
    -- Deduct from source warehouse
    UPDATE product_warehouses
    SET quantity = quantity - NEW.quantity,
        last_updated_at = now(),
        last_updated_by = auth.uid()
    WHERE id = NEW.from_product_warehouse_id;
    
    -- Add to destination warehouse
    UPDATE product_warehouses
    SET quantity = quantity + NEW.quantity,
        last_updated_at = now(),
        last_updated_by = auth.uid()
    WHERE id = NEW.to_product_warehouse_id;
    
    -- Mark transfer as completed
    NEW.completed_at := now();
    NEW.completed_by := auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. Apply audit triggers to relevant tables
DROP TRIGGER IF EXISTS audit_products ON products;
CREATE TRIGGER audit_products
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_warehouses ON warehouses;
CREATE TRIGGER audit_warehouses
  AFTER INSERT OR UPDATE OR DELETE ON warehouses
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_product_warehouses ON product_warehouses;
CREATE TRIGGER audit_product_warehouses
  AFTER INSERT OR UPDATE OR DELETE ON product_warehouses
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 15. Apply inventory movement validation trigger
DROP TRIGGER IF EXISTS validate_inventory_adjustment ON inventory_adjustments;
CREATE TRIGGER validate_inventory_adjustment
  BEFORE INSERT ON inventory_adjustments
  FOR EACH ROW EXECUTE FUNCTION validate_inventory_movement();

-- 16. Apply sales inventory deduction trigger
DROP TRIGGER IF EXISTS deduct_inventory_on_sale ON sale_items;
CREATE TRIGGER deduct_inventory_on_sale
  AFTER INSERT ON sale_items
  FOR EACH ROW EXECUTE FUNCTION deduct_inventory_from_warehouse();

-- 17. Apply inventory transfer processing trigger
DROP TRIGGER IF EXISTS process_transfer ON inventory_transfers;
CREATE TRIGGER process_transfer
  BEFORE UPDATE ON inventory_transfers
  FOR EACH ROW EXECUTE FUNCTION process_inventory_transfer();

-- 18. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_warehouses_product_id ON product_warehouses(product_id);
CREATE INDEX IF NOT EXISTS idx_product_warehouses_warehouse_id ON product_warehouses(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_product_warehouses_composite ON product_warehouses(product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit_logs(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_status ON inventory_transfers(status);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_product_warehouse ON inventory_adjustments(product_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_created ON inventory_movements(product_id, created_at DESC);

-- 19. Enable RLS on new tables
ALTER TABLE product_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_changes ENABLE ROW LEVEL SECURITY;

-- 20. Create RLS policies for product_warehouses
CREATE POLICY "Users can view product warehouses" ON product_warehouses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage product warehouses" ON product_warehouses
  FOR ALL TO authenticated USING (true);

-- 21. Create RLS policies for audit logs
CREATE POLICY "Users can view audit logs" ON audit_logs
  FOR SELECT TO authenticated USING (true);

-- 22. Create RLS policies for inventory transfers
CREATE POLICY "Users can view transfers" ON inventory_transfers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create transfers" ON inventory_transfers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update transfers" ON inventory_transfers
  FOR UPDATE TO authenticated USING (true);

-- 23. Create RLS policies for inventory adjustments
CREATE POLICY "Users can view adjustments" ON inventory_adjustments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create adjustments" ON inventory_adjustments
  FOR INSERT TO authenticated WITH CHECK (true);

-- 24. Create RLS policies for goal changes
CREATE POLICY "Users can view goal changes" ON goal_changes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create goal changes" ON goal_changes
  FOR INSERT TO authenticated WITH CHECK (true);

-- 25. Insert default warehouse if not exists
INSERT INTO warehouses (name, location, created_by)
SELECT 'Principal', 'Main Warehouse', auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE name = 'Principal');

-- 26. Migrate existing product stock to product_warehouses
INSERT INTO product_warehouses (product_id, warehouse_id, quantity, created_by, last_updated_by)
SELECT p.id, w.id, p.stock, auth.uid(), auth.uid()
FROM products p
CROSS JOIN warehouses w
WHERE w.name = 'Principal'
AND NOT EXISTS (
  SELECT 1 FROM product_warehouses pw 
  WHERE pw.product_id = p.id AND pw.warehouse_id = w.id
);

-- 27. Create views for easier querying
CREATE OR REPLACE VIEW product_stock_summary AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.sku,
  p.price,
  p.active,
  COALESCE(SUM(pw.quantity), 0) as total_stock,
  COALESCE(SUM(pw.available_quantity), 0) as total_available,
  COUNT(pw.id) as warehouse_count,
  MAX(pw.last_updated_at) as last_stock_update,
  COALESCE((
    SELECT SUM(quantity)
    FROM sale_items
    WHERE product_id = p.id
  ), 0) as quantity_sold
FROM products p
LEFT JOIN product_warehouses pw ON p.id = pw.product_id
GROUP BY p.id, p.name, p.sku, p.price, p.active;

CREATE OR REPLACE VIEW warehouse_stock_summary AS
SELECT 
  w.id as warehouse_id,
  w.name as warehouse_name,
  COUNT(pw.product_id) as product_count,
  COALESCE(SUM(pw.quantity), 0) as total_stock,
  COALESCE(SUM(pw.available_quantity), 0) as total_available
FROM warehouses w
LEFT JOIN product_warehouses pw ON w.id = pw.warehouse_id
GROUP BY w.id, w.name;