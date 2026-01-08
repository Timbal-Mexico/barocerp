-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  created_at timestamptz DEFAULT now()
);

-- Insert default warehouse if not exists
INSERT INTO warehouses (name, location) 
SELECT 'Principal', 'Main HQ'
WHERE NOT EXISTS (SELECT 1 FROM warehouses);

-- Update sales table
DO $$ 
BEGIN 
  -- Add marketing_channel
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'marketing_channel') THEN
    ALTER TABLE sales ADD COLUMN marketing_channel text;
  END IF;

  -- Add warehouse_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'warehouse_id') THEN
    ALTER TABLE sales ADD COLUMN warehouse_id uuid REFERENCES warehouses(id);
  END IF;

  -- Add delivery_city
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'delivery_city') THEN
    ALTER TABLE sales ADD COLUMN delivery_city text;
  END IF;

  -- Add agent_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'agent_name') THEN
    ALTER TABLE sales ADD COLUMN agent_name text;
  END IF;

  -- Add external_id for sync
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'external_id') THEN
    ALTER TABLE sales ADD COLUMN external_id text UNIQUE;
  END IF;

  -- Add source
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'source') THEN
    ALTER TABLE sales ADD COLUMN source text DEFAULT 'manual';
  END IF;
END $$;

-- Update channel check constraint to include 'shopify'
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_channel_check;
ALTER TABLE sales ADD CONSTRAINT sales_channel_check CHECK (channel IN ('facebook', 'instagram', 'whatsapp', 'web', 'organico', 'shopify', 'other'));

-- Create integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS for new tables
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view warehouses" ON warehouses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert warehouses" ON warehouses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update warehouses" ON warehouses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view integrations" ON integrations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert integrations" ON integrations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update integrations" ON integrations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
