-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS sales_order_number_seq;

-- Function to get next order number sequence
CREATE OR REPLACE FUNCTION get_next_order_sequence()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN nextval('sales_order_number_seq');
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_next_order_sequence TO authenticated;

-- Attempt to seed the sequence from existing data if any matches BR1940-XXXX
DO $$
DECLARE
  max_val integer;
BEGIN
  -- Look for order_number like 'BR1940-%'
  SELECT MAX(CAST(SUBSTRING(order_number FROM 'BR1940-(\d+)') AS integer))
  INTO max_val
  FROM sales
  WHERE order_number ~ '^BR1940-\d+$';

  IF max_val IS NOT NULL THEN
    PERFORM setval('sales_order_number_seq', max_val);
  END IF;
END $$;
