
create table if not exists public.roles (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default roles
insert into public.roles (name, description) values
('admin', 'Administrador del sistema'),
('sales', 'Vendedor'),
('manager', 'Gerente'),
('warehouse', 'Encargado de almacén'),
('supplier', 'Proveedor')
on conflict (name) do nothing;

-- Update profiles to reference roles? 
-- For now we keep profiles.role as text but ideally it should FK to roles.id or roles.name.
-- Let's keep it loose for now to avoid breaking existing data, but UI will enforce selection from roles table.
