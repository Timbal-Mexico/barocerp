-- ============================================
-- ERP LIGERO - SCHEMA COMPLETO
-- ============================================
-- Sistema ERP con CRM, Inventarios y BI
-- Base de datos: PostgreSQL (Supabase)
-- ============================================

-- TABLA: products
-- Catálogo de productos con control de stock
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- TABLA: warehouses
-- Almacenes de inventario
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  created_at timestamptz DEFAULT now()
);

-- TABLA: integrations
-- Configuración de integraciones externas (Shopify, etc.)
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLA: leads
-- CRM para gestión de contactos potenciales
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  interest_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  contact_channel text NOT NULL CHECK (contact_channel IN ('facebook', 'instagram', 'whatsapp', 'web', 'otro')),
  created_at timestamptz DEFAULT now()
);

-- TABLA: sales
-- Registro de ventas con lead y canal
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('facebook', 'instagram', 'whatsapp', 'web', 'organico', 'shopify', 'other')),
  total_amount numeric(10,2) NOT NULL CHECK (total_amount >= 0),
  promotion_type text CHECK (promotion_type IN ('none', '2x1', '3x1', 'percentage')) DEFAULT 'none',
  discount_value numeric(10,2) DEFAULT 0,
  marketing_channel text,
  warehouse_id uuid REFERENCES warehouses(id),
  delivery_city text,
  agent_name text,
  external_id text UNIQUE,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

-- TABLA: sale_items
-- Detalle de productos vendidos
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  price numeric(10,2) NOT NULL CHECK (price >= 0)
);

-- TABLA: inventory_movements
-- Historial de movimientos de inventario
CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  reason text NOT NULL CHECK (reason IN ('sale', 'manual_adjustment', 'initial_stock', 'return')),
  created_at timestamptz DEFAULT now()
);

-- TABLA: goals
-- Objetivos mensuales de ventas
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  target_amount numeric(10,2) NOT NULL CHECK (target_amount > 0),
  channel text CHECK (channel IN ('facebook', 'instagram', 'whatsapp', 'web', 'organico', 'all')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(month, channel)
);

-- TABLA: companies
-- Empresas a las que pueden pertenecer usuarios y experiencias
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  phone text,
  email text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLA: user_profiles
-- Perfiles extendidos de usuario ligados a auth.users
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  name text NOT NULL,
  lastname text NOT NULL,
  email text NOT NULL UNIQUE,
  department text,
  profile_picture text,
  residence_city text,
  theme text DEFAULT 'system',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLA: project_experiences
-- Experiencias de proyecto ligadas a un perfil de usuario
CREATE TABLE IF NOT EXISTS project_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  company_name text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_order_number ON sales(order_number);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_channel ON sales(channel);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goals_month ON goals(month);

-- ============================================
-- TRIGGER: DESCUENTO AUTOMÁTICO DE INVENTARIO
-- ============================================

CREATE OR REPLACE FUNCTION deduct_inventory()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar stock del producto
  UPDATE products
  SET stock = stock - NEW.quantity
  WHERE id = NEW.product_id;

  -- Registrar movimiento de inventario
  INSERT INTO inventory_movements (product_id, quantity, reason)
  VALUES (NEW.product_id, -NEW.quantity, 'sale');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_deduct_inventory ON sale_items;
CREATE TRIGGER auto_deduct_inventory
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION deduct_inventory();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_experiences ENABLE ROW LEVEL SECURITY;

-- Políticas para products
CREATE POLICY "Users can view products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert products" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update products" ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete products" ON products FOR DELETE TO authenticated USING (true);

-- Políticas para leads
CREATE POLICY "Users can view leads" ON leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert leads" ON leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update leads" ON leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete leads" ON leads FOR DELETE TO authenticated USING (true);

-- Políticas para sales
CREATE POLICY "Users can view sales" ON sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert sales" ON sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update sales" ON sales FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete sales" ON sales FOR DELETE TO authenticated USING (true);

-- Políticas para sale_items
CREATE POLICY "Users can view sale_items" ON sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert sale_items" ON sale_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update sale_items" ON sale_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete sale_items" ON sale_items FOR DELETE TO authenticated USING (true);

-- Políticas para inventory_movements
CREATE POLICY "Users can view inventory_movements" ON inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert inventory_movements" ON inventory_movements FOR INSERT TO authenticated WITH CHECK (true);

-- Políticas para goals
CREATE POLICY "Users can view goals" ON goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert goals" ON goals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update goals" ON goals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete goals" ON goals FOR DELETE TO authenticated USING (true);

-- Políticas para companies
CREATE POLICY "Users can view companies" ON companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert companies" ON companies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update companies" ON companies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Políticas para user_profiles (sólo el dueño)
CREATE POLICY "Users can view own user_profile" ON user_profiles FOR SELECT TO authenticated USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can insert own user_profile" ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "Users can update own user_profile" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = auth_user_id) WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "Users can delete own user_profile" ON user_profiles FOR DELETE TO authenticated USING (auth.uid() = auth_user_id);

-- Políticas para project_experiences (ligadas al perfil del usuario)
CREATE POLICY "Users can view own project_experiences" ON project_experiences FOR SELECT TO authenticated USING (
  user_profile_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Users can insert own project_experiences" ON project_experiences FOR INSERT TO authenticated WITH CHECK (
  user_profile_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Users can update own project_experiences" ON project_experiences FOR UPDATE TO authenticated USING (
  user_profile_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
) WITH CHECK (
  user_profile_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Users can delete own project_experiences" ON project_experiences FOR DELETE TO authenticated USING (
  user_profile_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
);

-- ============================================
-- FIN DEL SCHEMA
-- ============================================
