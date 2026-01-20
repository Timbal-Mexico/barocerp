
-- Migration: 20260116110000_add_agent_goals.sql

-- 1. Add agent_id to goals table
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Drop existing unique constraint if it exists
-- We wrap in DO block to handle potential missing constraint gracefully or just try dropping
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goals_month_channel_key') THEN
    ALTER TABLE public.goals DROP CONSTRAINT goals_month_channel_key;
  END IF;
END $$;

-- 3. Create new unique indexes to handle both global (channel-based) and agent (total) goals
-- Global goals: Unique per month + channel (where agent is null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_global_unique 
ON public.goals (month, channel) 
WHERE agent_id IS NULL;

-- Agent goals: Unique per month + agent (ignoring channel, assuming agent goals are total)
-- We'll enforce channel = 'all' or NULL for agent goals in app logic, or just ignore it in index
CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_agent_unique 
ON public.goals (month, agent_id) 
WHERE agent_id IS NOT NULL;

-- 4. Update log_goal_changes trigger function to include agent_id
CREATE OR REPLACE FUNCTION log_goal_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.target_amount <> NEW.target_amount 
     OR OLD.channel IS DISTINCT FROM NEW.channel 
     OR OLD.agent_id IS DISTINCT FROM NEW.agent_id THEN
    INSERT INTO goal_changes (
      goal_id,
      old_target_amount,
      new_target_amount,
      old_channel,
      new_channel,
      changed_by,
      changed_at,
      reason
    ) VALUES (
      NEW.id,
      OLD.target_amount,
      NEW.target_amount,
      OLD.channel,
      NEW.channel,
      auth.uid(),
      now(),
      'Update via application'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
