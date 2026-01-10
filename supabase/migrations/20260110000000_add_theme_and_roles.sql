-- Add theme column to profiles if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'system';

-- Add roles column check if not exists (although usually added manually or via other migration)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'sales', 'manager', 'warehouse');
    END IF;
END $$;

-- Update profiles to ensure role column uses the enum or text with check
-- For simplicity, we keep it as text if already created, but let's document it.
-- Assuming 'role' column already exists from previous context. 
-- If not:
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'sales';
