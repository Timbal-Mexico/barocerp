-- Drop the view first to avoid "cannot change name of view column" error
DROP VIEW IF EXISTS public.product_stock_summary;

-- Recreate the view with the image_url column
CREATE OR REPLACE VIEW public.product_stock_summary AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.sku,
  p.price,
  p.active,
  p.created_at,
  p.image_url,
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
GROUP BY p.id, p.name, p.sku, p.price, p.active, p.created_at, p.image_url;
