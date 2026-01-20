-- Migration: 20260119120000_allow_profile_updates_and_audit.sql

-- 1. Drop the restrictive trigger that prevents name/lastname changes
DROP TRIGGER IF EXISTS trg_prevent_user_profile_name_change ON public.user_profiles;
DROP FUNCTION IF EXISTS public.prevent_user_profile_name_change();

-- 2. Apply audit trigger to user_profiles
-- Ensure the function audit_trigger_function exists (it is created in 20260109000000_inventory_system_redesign.sql)
DROP TRIGGER IF EXISTS audit_user_profiles ON public.user_profiles;
CREATE TRIGGER audit_user_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
