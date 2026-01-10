-- Add assignment fields to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assigned_sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_list text;

CREATE INDEX IF NOT EXISTS idx_leads_assigned_sale ON public.leads(assigned_sale_id);
