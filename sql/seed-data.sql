-- ============================================
-- ERP LIGERO - DATOS DE EJEMPLO
-- ============================================
-- Este script inserta datos de ejemplo para
-- probar todas las funcionalidades del sistema
-- ============================================

-- PRODUCTOS DE EJEMPLO
INSERT INTO products (name, sku, price, stock, active) VALUES
  ('Laptop Dell XPS 13', 'LAP-001', 1299.99, 15, true),
  ('Mouse Logitech MX Master', 'MOU-001', 99.99, 50, true),
  ('Teclado Mecánico RGB', 'KEY-001', 149.99, 30, true),
  ('Monitor 27" 4K', 'MON-001', 499.99, 10, true),
  ('Webcam HD 1080p', 'WEB-001', 79.99, 25, true),
  ('Auriculares Bluetooth', 'AUR-001', 199.99, 40, true),
  ('SSD 1TB NVMe', 'SSD-001', 129.99, 60, true),
  ('Hub USB-C 7 puertos', 'HUB-001', 49.99, 100, true)
ON CONFLICT (sku) DO NOTHING;

-- LEADS DE EJEMPLO
WITH laptop AS (
  SELECT id FROM products WHERE sku = 'LAP-001' LIMIT 1
)
INSERT INTO leads (name, email, phone, interest_product_id, contact_channel)
SELECT 'Juan Pérez', 'juan.perez@email.com', '+34612345678', id, 'facebook'
FROM laptop
ON CONFLICT DO NOTHING;

WITH monitor AS (
  SELECT id FROM products WHERE sku = 'MON-001' LIMIT 1
)
INSERT INTO leads (name, email, phone, interest_product_id, contact_channel)
SELECT 'María García', 'maria.garcia@email.com', '+34623456789', id, 'instagram'
FROM monitor
ON CONFLICT DO NOTHING;

WITH keyboard AS (
  SELECT id FROM products WHERE sku = 'KEY-001' LIMIT 1
)
INSERT INTO leads (name, email, phone, interest_product_id, contact_channel)
SELECT 'Carlos López', 'carlos.lopez@email.com', '+34634567890', id, 'whatsapp'
FROM keyboard
ON CONFLICT DO NOTHING;

INSERT INTO leads (name, email, phone, interest_product_id, contact_channel) VALUES
  ('Ana Martínez', 'ana.martinez@email.com', '+34645678901', NULL, 'web'),
  ('Pedro Sánchez', 'pedro.sanchez@email.com', '+34656789012', NULL, 'whatsapp'),
  ('Laura Fernández', 'laura.fernandez@email.com', '+34667890123', NULL, 'facebook')
ON CONFLICT DO NOTHING;

-- OBJETIVOS MENSUALES
INSERT INTO goals (month, target_amount, channel) VALUES
  ('2026-01', 50000.00, 'all'),
  ('2026-01', 15000.00, 'facebook'),
  ('2026-01', 12000.00, 'instagram'),
  ('2026-01', 10000.00, 'whatsapp'),
  ('2026-01', 8000.00, 'web'),
  ('2026-02', 55000.00, 'all')
ON CONFLICT (month, channel) DO NOTHING;

-- VENTAS DE EJEMPLO
-- Nota: Los sale_items descontarán inventario automáticamente vía trigger

DO $$
DECLARE
  v_sale_id uuid;
  v_lead_id uuid;
  v_product_id uuid;
BEGIN
  -- Venta 1: Juan Pérez compra Laptop
  SELECT id INTO v_lead_id FROM leads WHERE email = 'juan.perez@email.com' LIMIT 1;
  SELECT id INTO v_product_id FROM products WHERE sku = 'LAP-001' LIMIT 1;

  IF v_lead_id IS NOT NULL AND v_product_id IS NOT NULL THEN
    INSERT INTO sales (order_number, lead_id, channel, total_amount, created_at, agent_name)
    VALUES ('ORD-2026-0001', v_lead_id, 'facebook', 1299.99, NOW() - INTERVAL '5 days', 'Carlos Ventas')
    ON CONFLICT (order_number) DO NOTHING
    RETURNING id INTO v_sale_id;

    IF v_sale_id IS NOT NULL THEN
      INSERT INTO sale_items (sale_id, product_id, quantity, price)
      VALUES (v_sale_id, v_product_id, 1, 1299.99)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Venta 2: María García compra Monitor + Mouse
  SELECT id INTO v_lead_id FROM leads WHERE email = 'maria.garcia@email.com' LIMIT 1;

  IF v_lead_id IS NOT NULL THEN
    INSERT INTO sales (order_number, lead_id, channel, total_amount, created_at, agent_name)
    VALUES ('ORD-2026-0002', v_lead_id, 'instagram', 599.98, NOW() - INTERVAL '3 days', 'Ana Comercial')
    ON CONFLICT (order_number) DO NOTHING
    RETURNING id INTO v_sale_id;

    IF v_sale_id IS NOT NULL THEN
      SELECT id INTO v_product_id FROM products WHERE sku = 'MON-001' LIMIT 1;
      IF v_product_id IS NOT NULL THEN
        INSERT INTO sale_items (sale_id, product_id, quantity, price)
        VALUES (v_sale_id, v_product_id, 1, 499.99)
        ON CONFLICT DO NOTHING;
      END IF;

      SELECT id INTO v_product_id FROM products WHERE sku = 'MOU-001' LIMIT 1;
      IF v_product_id IS NOT NULL THEN
        INSERT INTO sale_items (sale_id, product_id, quantity, price)
        VALUES (v_sale_id, v_product_id, 1, 99.99)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  -- Venta 3: Carlos López compra Teclado + Auriculares
  SELECT id INTO v_lead_id FROM leads WHERE email = 'carlos.lopez@email.com' LIMIT 1;

  IF v_lead_id IS NOT NULL THEN
    INSERT INTO sales (order_number, lead_id, channel, total_amount, created_at, agent_name)
    VALUES ('ORD-2026-0003', v_lead_id, 'whatsapp', 349.98, NOW() - INTERVAL '2 days', 'Carlos Ventas')
    ON CONFLICT (order_number) DO NOTHING
    RETURNING id INTO v_sale_id;

    IF v_sale_id IS NOT NULL THEN
      SELECT id INTO v_product_id FROM products WHERE sku = 'KEY-001' LIMIT 1;
      IF v_product_id IS NOT NULL THEN
        INSERT INTO sale_items (sale_id, product_id, quantity, price)
        VALUES (v_sale_id, v_product_id, 1, 149.99)
        ON CONFLICT DO NOTHING;
      END IF;

      SELECT id INTO v_product_id FROM products WHERE sku = 'AUR-001' LIMIT 1;
      IF v_product_id IS NOT NULL THEN
        INSERT INTO sale_items (sale_id, product_id, quantity, price)
        VALUES (v_sale_id, v_product_id, 1, 199.99)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  -- Venta 4: Ana Martínez compra SSD + Hub
  SELECT id INTO v_lead_id FROM leads WHERE email = 'ana.martinez@email.com' LIMIT 1;

  IF v_lead_id IS NOT NULL THEN
    INSERT INTO sales (order_number, lead_id, channel, total_amount, created_at, agent_name)
    VALUES ('ORD-2026-0004', v_lead_id, 'web', 179.98, NOW() - INTERVAL '1 day', 'Ana Comercial')
    ON CONFLICT (order_number) DO NOTHING
    RETURNING id INTO v_sale_id;

    IF v_sale_id IS NOT NULL THEN
      SELECT id INTO v_product_id FROM products WHERE sku = 'SSD-001' LIMIT 1;
      IF v_product_id IS NOT NULL THEN
        INSERT INTO sale_items (sale_id, product_id, quantity, price)
        VALUES (v_sale_id, v_product_id, 1, 129.99)
        ON CONFLICT DO NOTHING;
      END IF;

      SELECT id INTO v_product_id FROM products WHERE sku = 'HUB-001' LIMIT 1;
      IF v_product_id IS NOT NULL THEN
        INSERT INTO sale_items (sale_id, product_id, quantity, price)
        VALUES (v_sale_id, v_product_id, 1, 49.99)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  -- Venta 5: Pedro Sánchez compra Webcam
  SELECT id INTO v_lead_id FROM leads WHERE email = 'pedro.sanchez@email.com' LIMIT 1;

  IF v_lead_id IS NOT NULL THEN
    INSERT INTO sales (order_number, lead_id, channel, total_amount, created_at, agent_name)
    VALUES ('ORD-2026-0005', v_lead_id, 'whatsapp', 79.99, NOW(), 'Carlos Ventas')
    ON CONFLICT (order_number) DO NOTHING
    RETURNING id INTO v_sale_id;

    IF v_sale_id IS NOT NULL THEN
      SELECT id INTO v_product_id FROM products WHERE sku = 'WEB-001' LIMIT 1;
      IF v_product_id IS NOT NULL THEN
        INSERT INTO sale_items (sale_id, product_id, quantity, price)
        VALUES (v_sale_id, v_product_id, 1, 79.99)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;
END $$;

-- ============================================
-- FIN DE DATOS DE EJEMPLO
-- ============================================
