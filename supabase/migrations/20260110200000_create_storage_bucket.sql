-- Create the storage bucket 'erpcommerce' if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('erpcommerce', 'erpcommerce', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Note: We assume policies are already applied by the previous migration (20260110193000_storage_policies.sql).
-- If not, they should be applied as well.
