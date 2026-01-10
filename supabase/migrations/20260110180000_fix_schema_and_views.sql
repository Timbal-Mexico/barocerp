-- Fix script to ensure all inventory tables exist and views work
-- Run this in Supabase SQL Editor

-- 1. Ensure warehouses table exists
CREATE TABLE IF NOT EXISTS public.warehouses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    location text,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    last_updated_by uuid REFERENCES auth.users(id),
    last_updated_at timestamptz DEFAULT now()
);

-- Insert default warehouse if it doesn't exist
INSERT INTO public.warehouses (name, location)
SELECT 'Principal', 'Almacén Principal'
WHERE NOT EXISTS (SELECT 1 FROM public.warehouses);

-- 2. Ensure product_warehouses table exists
CREATE TABLE IF NOT EXISTS public.product_warehouses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reserved_quantity integer NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    available_quantity integer GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
    last_updated_at timestamptz DEFAULT now(),
    last_updated_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    UNIQUE(product_id, warehouse_id)
);

-- 3. Ensure other inventory tables exist
CREATE TABLE IF NOT EXISTS public.inventory_transfers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_warehouse_id uuid NOT NULL REFERENCES public.product_warehouses(id),
    adjustment_quantity integer NOT NULL,
    reason text NOT NULL,
    notes text,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    approved_by uuid REFERENCES auth.users(id),
    approved_at timestamptz
);

-- 4. Enable RLS
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies (simplified for immediate fix)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'warehouses' AND policyname = 'Enable read access for all users') THEN
        CREATE POLICY "Enable read access for all users" ON public.warehouses FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'warehouses' AND policyname = 'Enable insert for authenticated users') THEN
        CREATE POLICY "Enable insert for authenticated users" ON public.warehouses FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_warehouses' AND policyname = 'Enable read access for all users') THEN
        CREATE POLICY "Enable read access for all users" ON public.product_warehouses FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_warehouses' AND policyname = 'Enable write for authenticated users') THEN
        CREATE POLICY "Enable write for authenticated users" ON public.product_warehouses FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 6. Initialize product_warehouses with existing stock if empty
INSERT INTO public.product_warehouses (product_id, warehouse_id, quantity)
SELECT p.id, w.id, p.stock
FROM public.products p
CROSS JOIN public.warehouses w
WHERE w.name = 'Principal'
AND NOT EXISTS (SELECT 1 FROM public.product_warehouses);

-- 7. Create Views
CREATE OR REPLACE VIEW public.product_stock_summary AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.sku,
  p.price,
  p.active,
  p.created_at,
  COALESCE(SUM(pw.quantity), 0) as total_stock,
  COALESCE(COUNT(DISTINCT pw.warehouse_id), 0) as warehouse_count,
  MAX(pw.last_updated_at) as last_stock_update,
  COALESCE((
    SELECT SUM(quantity)
    FROM public.sale_items
    WHERE product_id = p.id
  ), 0) as quantity_sold
FROM public.products p
LEFT JOIN public.product_warehouses pw ON p.id = pw.product_id
GROUP BY p.id, p.name, p.sku, p.price, p.active, p.created_at;

CREATE OR REPLACE VIEW public.warehouse_stock_summary AS
SELECT 
  w.id as warehouse_id,
  w.name as warehouse_name,
  COUNT(pw.product_id) as product_count,
  COALESCE(SUM(pw.quantity), 0) as total_stock,
  COALESCE(SUM(pw.available_quantity), 0) as total_available
FROM public.warehouses w
LEFT JOIN public.product_warehouses pw ON w.id = pw.warehouse_id
GROUP BY w.id, w.name;
