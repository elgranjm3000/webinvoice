-- =============================================================
-- 008_company_localization.sql — Pegar en el SQL Editor de Supabase
--   Localización de la empresa: el sistema deja de ser solo Venezuela.
--   Cada empresa declara su país, moneda principal, locale y su
--   impuesto principal. Venezuela conserva el flujo SENIAT completo
--   (n° de control, Bs., IGTF) vía secondary_currency.
-- =============================================================

alter table public.companies
  add column if not exists country_code    text not null default 'VE',
  add column if not exists currency_code   text not null default 'USD',
  add column if not exists currency_symbol text not null default '$',
  add column if not exists locale          text not null default 'es-VE',
  add column if not exists tax_name        text not null default 'IVA',
  add column if not exists tax_id_label    text not null default 'RIF',
  add column if not exists secondary_currency text,          -- 'VES' en VE; null = sin multimoneda
  add column if not exists uses_igtf       boolean not null default false;
