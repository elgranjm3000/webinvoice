-- =============================================================
-- 007_login_audit.sql — Pegar en el SQL Editor de Supabase
--   · login_audit: registro de accesos (quién, cuándo, resultado).
--     Se escribe desde el server action de login con la clave de
--     servicio; RLS sin políticas = nadie la lee por API de anon,
--     solo el servidor.
-- =============================================================

create table if not exists public.login_audit (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  success     boolean not null default false,
  ip          text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists login_audit_created_at_idx
  on public.login_audit (created_at desc);

alter table public.login_audit enable row level security;

-- Sin políticas: solo la clave de servicio (el servidor) lee y escribe.
