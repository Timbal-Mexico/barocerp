/*
  # Add promotion fields to sales table

  1. New Columns
    - `promotion_type` (text): Type of promotion applied ('none', '2x1', '3x1', 'percentage')
    - `discount_value` (numeric): Value of the discount (e.g., percentage amount)
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'promotion_type') THEN
    ALTER TABLE sales ADD COLUMN promotion_type text CHECK (promotion_type IN ('none', '2x1', '3x1', 'percentage')) DEFAULT 'none';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'discount_value') THEN
    ALTER TABLE sales ADD COLUMN discount_value numeric(10,2) DEFAULT 0;
  END IF;
END $$;
