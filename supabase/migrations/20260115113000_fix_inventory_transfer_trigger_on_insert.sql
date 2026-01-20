-- Asegurar que las transferencias actualicen stock al crearse

DROP TRIGGER IF EXISTS process_transfer ON public.inventory_transfers;

CREATE TRIGGER process_transfer
  BEFORE INSERT OR UPDATE ON public.inventory_transfers
  FOR EACH ROW EXECUTE FUNCTION inventory_transfers.process_inventory_transfer();

