-- Fix storage policies to ensure they use the correct bucket name 'erpcommerce_files'

-- Drop potentially incorrect policies (old or new names)
DROP POLICY IF EXISTS "Public Access erpcommerce" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload erpcommerce" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update erpcommerce" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete erpcommerce" ON storage.objects;

-- Also drop policies if they were named differently in previous attempts but targeting the same logic
-- (Optional, but good practice if we suspect naming churn, though we stuck to 'erpcommerce' in names)

-- Re-create policies with correct bucket name 'erpcommerce_files'

-- 1. Public Access (Read)
-- Allows anyone (including unauthenticated) to read files if they know the path
CREATE POLICY "Public Access erpcommerce"
ON storage.objects FOR SELECT
USING ( bucket_id = 'erpcommerce_files' );

-- 2. Authenticated Upload
-- Allows any authenticated user to upload files to this bucket
CREATE POLICY "Authenticated Upload erpcommerce"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'erpcommerce_files' );

-- 3. Authenticated Update
-- Allows any authenticated user to update files in this bucket
CREATE POLICY "Authenticated Update erpcommerce"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'erpcommerce_files' );

-- 4. Authenticated Delete
-- Allows any authenticated user to delete files in this bucket
CREATE POLICY "Authenticated Delete erpcommerce"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'erpcommerce_files' );
