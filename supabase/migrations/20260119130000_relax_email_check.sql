-- Migration: 20260119130000_relax_email_check.sql

-- 1. Relax email check constraint on user_profiles
-- The previous regex was too strict or problematic. We will rely on Supabase Auth validation
-- and a simpler basic structure check.

ALTER TABLE public.user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_email_check;

ALTER TABLE public.user_profiles 
  ADD CONSTRAINT user_profiles_email_check 
  CHECK (position('@' in email) > 0 AND length(email) > 3);

-- 2. Relax email check constraint on companies (for consistency)
ALTER TABLE public.companies 
  DROP CONSTRAINT IF EXISTS companies_email_check;

ALTER TABLE public.companies 
  ADD CONSTRAINT companies_email_check 
  CHECK (email IS NULL OR (position('@' in email) > 0 AND length(email) > 3));
