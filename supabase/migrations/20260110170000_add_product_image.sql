-- Add image_url column to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for product images (public read)
DO $$
BEGIN
  PERFORM 1 FROM storage.buckets WHERE name = 'erpcommerce';
  IF NOT FOUND THEN
    PERFORM storage.create_bucket('erpcommerce', public := true);
  END IF;
END$$;
