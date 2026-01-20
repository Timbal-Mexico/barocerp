
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'new';

-- Update existing leads to have 'new' status if null (though default handles new inserts)
UPDATE leads SET status = 'new' WHERE status IS NULL;

-- Add check constraint for status values
ALTER TABLE leads 
ADD CONSTRAINT leads_status_check 
CHECK (status IN ('new', 'contacted', 'interested', 'qualified', 'closed', 'lost'));
