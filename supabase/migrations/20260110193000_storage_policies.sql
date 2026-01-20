-- Policy for public read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public Access erpcommerce'
  ) THEN
    CREATE POLICY "Public Access erpcommerce"
    ON storage.objects FOR SELECT
    USING ( bucket_id = 'erpcommerce_files' );
  END IF;
END$$;

-- Policy for authenticated uploads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated Upload erpcommerce'
  ) THEN
    CREATE POLICY "Authenticated Upload erpcommerce"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK ( bucket_id = 'erpcommerce_files' );
  END IF;
END$$;

-- Policy for authenticated updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated Update erpcommerce'
  ) THEN
    CREATE POLICY "Authenticated Update erpcommerce"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING ( bucket_id = 'erpcommerce_files' );
  END IF;
END$$;

-- Policy for authenticated deletes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated Delete erpcommerce'
  ) THEN
    CREATE POLICY "Authenticated Delete erpcommerce"
    ON storage.objects FOR DELETE
    TO authenticated
    USING ( bucket_id = 'erpcommerce_files' );
  END IF;
END$$;
