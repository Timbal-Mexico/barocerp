-- Add agent_id to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_sales_agent_id ON sales(agent_id);

-- Update existing sales with agent_id based on agent_name matching profile full_name
UPDATE sales s
SET agent_id = p.id
FROM profiles p
WHERE s.agent_name = p.full_name
  AND s.agent_id IS NULL;
