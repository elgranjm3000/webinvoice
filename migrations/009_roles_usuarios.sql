-- =============================================================
-- 009_roles_usuarios.sql — Pegar en el SQL Editor de Supabase
--   · roles: roles por empresa con la lista de módulos visibles
--     (jsonb: arreglo de prefijos de ruta, ej. ["/facturas","/cobrar"])
--   · company_users.role_id: vincula el usuario al rol de la empresa.
--     Los usuarios con role='admin' (columna legada) o role.is_admin
--     tienen acceso total.
-- =============================================================

create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  modules     jsonb not null default '[]'::jsonb,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (company_id, name)
);

alter table public.company_users
  add column if not exists role_id uuid references public.roles(id) on delete set null;

-- Lectura/escritura solo vía clave de servicio (el servidor).
alter table public.roles enable row level security;
