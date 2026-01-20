
-- Add theme column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'system';

-- Ensure RLS allows users to update their own theme
-- (Existing policy "Users can update own user_profile" covers this as it allows UPDATE on the whole row)
