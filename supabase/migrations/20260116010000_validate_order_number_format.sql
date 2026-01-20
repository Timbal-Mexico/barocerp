-- Migration: 20260116010000_validate_order_number_format.sql

-- The regex matches either:
--   - BR1940-<digits> (new format)
--   - ORD-YYYY-NNNN (legacy seeded data)
ALTER TABLE sales
  ADD CONSTRAINT sales_order_number_check
  CHECK (
    order_number ~ '^BR1940-\d+$'
    OR order_number ~ '^ORD-\d{4}-\d{4}$'
  );
