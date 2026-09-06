-- =============================================================
-- 004_demo.sql — Datos y usuario de demostración (versión robusta)
--
--   email:    demo@factura2026.com
--   password: demo1234
--
-- El script tolera los check constraints del esquema: para las
-- columnas de tipo "enum" prueba varios valores candidatos y usa
-- el primero que acepta. Si algo falla, emite un WARNING y sigue.
-- Al final imprime todos los check constraints del esquema.
-- Seguro de re-ejecutar: no duplica datos.
-- =============================================================

-- ---------- Empresa demo (taxpayer_type: default de la tabla) ----------
insert into public.companies (id, tax_id, legal_name, trade_name, fiscal_address, phone, email, is_active)
values (
  '11111111-1111-1111-1111-111111111111',
  'J-40123456-7',
  'Distribuidora Andina, C.A.',
  'Distribuidora Andina',
  'Av. Los Cedros, Edif. La Candelaria, Piso 2, San Cristóbal, Táchira',
  '+58 276 5551234',
  'gerencia@dandina.com.ve',
  true
)
on conflict (id) do nothing;

-- ---------- Tasa BCV (hoy) ----------
insert into public.exchange_rates (rate_date, source_currency, target_currency, bcv_rate)
values (current_date, 'USD', 'VES', 236.50)
on conflict do nothing;

-- ---------- Punto de emisión (emission_type: default) ----------
insert into public.emission_points (id, company_id, branch_code, point_code, name, control_number_prefix, is_active)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  '01', '01',
  'Almacén principal — Caja 1',
  '00-1111',
  true
)
on conflict (id) do nothing;

-- ---------- Almacenes ----------
insert into public.warehouses (id, company_id, code, name, address, is_main, is_active) values
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'ALM-01', 'Almacén principal', 'Zona Industrial, San Cristóbal', true,  true),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'ALM-02', 'Sucursal Táriba',    'Calle 5, Táriba',             false, true)
on conflict (id) do nothing;

-- ---------- Productos ----------
insert into public.products (id, company_id, code, description, price_usd, applies_vat, vat_rate, unit_of_measure, is_service, is_active) values
  ('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', 'P-0001', 'Cemento gris Pdzol 42,5 kg',        6.80,  true,  16, 'saco',   false, true),
  ('55555555-5555-5555-5555-555555555552', '11111111-1111-1111-1111-111111111111', 'P-0002', 'Cabilla 3/8" x 6 m',               14.25,  true,  16, 'unidad', false, true),
  ('55555555-5555-5555-5555-555555555553', '11111111-1111-1111-1111-111111111111', 'P-0003', 'Bloque de hormigón 12x20x40',        1.15,  true,  16, 'unidad', false, true),
  ('55555555-5555-5555-5555-555555555554', '11111111-1111-1111-1111-111111111111', 'P-0004', 'Pintura vinílica blanca 19 L',      38.90,  true,  16, 'lata',   false, true),
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'P-0005', 'Servicio de flete dentro de la ciudad', 25.00, false, 16, 'viaje', true, true)
on conflict (id) do nothing;

-- ---------- Existencias iniciales ----------
insert into public.inventory_stock (id, company_id, warehouse_id, product_id, current_stock, min_stock, max_stock, aisle_location) values
  ('66666666-6666-6666-6666-666666666611', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', '55555555-5555-5555-5555-555555555551', 480, 100, 1000, 'A-01'),
  ('66666666-6666-6666-6666-666666666612', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', '55555555-5555-5555-5555-555555555552', 250,  50,  500, 'A-02'),
  ('66666666-6666-6666-6666-666666666613', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', '55555555-5555-5555-5555-555555555553', 1800, 300, 5000, 'B-01'),
  ('66666666-6666-6666-6666-666666666614', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', '55555555-5555-5555-5555-555555555554',  42,  10,  100, 'C-03'),
  ('66666666-6666-6666-6666-666666666621', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333332', '55555555-5555-5555-5555-555555555551',  85,  50,  300, 'A-01')
on conflict (id) do nothing;

-- ---------- Clientes (detecta el id_type válido automáticamente) ----------
do $$
declare
  v_id_type text;
  c text;
begin
  foreach c in array array['J', 'V', 'RIF', 'PJ', 'NRIF'] loop
    begin
      insert into public.customers (id, company_id, id_type, tax_id, legal_name, fiscal_address, phone, email, is_special_taxpayer)
      values (
        '44444444-4444-4444-4444-444444444441',
        '11111111-1111-1111-1111-111111111111',
        c, 'J-31234567-8', 'Ferretotal Los Andes, C.A.',
        'Av. 19 de Abril, Barrio Obrero, San Cristóbal',
        '+58 276 5558888', 'compras@ferretotal.com', true
      )
      on conflict (id) do nothing;
      v_id_type := c;
      exit;
    exception when check_violation then
      continue;
    end;
  end loop;

  if v_id_type is null then
    raise exception 'Ningún valor de customers.id_type pasó el check constraint. Revisa los NOTICE del final del script.';
  end if;
  raise notice 'customers.id_type válido detectado: %', v_id_type;

  insert into public.customers (id, company_id, id_type, tax_id, legal_name, fiscal_address, phone, email, is_special_taxpayer) values
    ('44444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111111', v_id_type, 'V-12345678',   'María Alejandra Rojas', 'Res. Los Naranjos, Apto 4-B, Táriba',      '+58 412 5556677', 'marojas@gmail.com', false),
    ('44444444-4444-4444-4444-444444444443', '11111111-1111-1111-1111-111111111111', v_id_type, 'J-30698765-4', 'Ferretería El Constructor', 'Av. Principal, La Pedrera, San Cristóbal', '+58 424 5551122', null,                false)
  on conflict (id) do nothing;
end $$;

-- ---------- Usuario demo (auth) ----------
-- email: demo@factura2026.com · password: demo1234
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current
)
select
  '00000000-0000-0000-0000-000000000000',
  '77777777-7777-7777-7777-777777777777',
  'authenticated', 'authenticated', 'demo@factura2026.com',
  crypt('demo1234', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(), now(), '', '', '', '', ''
where not exists (select 1 from auth.users where email = 'demo@factura2026.com');

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(),
  '77777777-7777-7777-7777-777777777777',
  'email', 'email',
  jsonb_build_object('sub', '77777777-7777-7777-7777-777777777777', 'email', 'demo@factura2026.com', 'email_verified', true),
  now(), now(), now()
where not exists (
  select 1 from auth.identities
  where provider = 'email'
    and identity_data->>'email' = 'demo@factura2026.com'
);

insert into public.company_users (company_id, user_id, role)
values ('11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777', 'admin')
on conflict do nothing;

-- ---------- Facturas de ejemplo ----------
-- Cada emisión es independiente: si una falla, se informa y se continúa.
do $$
begin
  begin
    perform public.emit_invoice(
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      '44444444-4444-4444-4444-444444444441',
      '33333333-3333-3333-3333-333333333331',
      '[
        {"product_id":"55555555-5555-5555-5555-555555555551","quantity":50,"unit_price_usd":6.80,"applies_vat":true,"vat_rate":16},
        {"product_id":"55555555-5555-5555-5555-555555555553","quantity":200,"unit_price_usd":1.15,"applies_vat":true,"vat_rate":16}
      ]'::jsonb,
      'Venta de contado'
    );
  exception when others then
    raise warning 'Factura de ejemplo 1 no creada: %', sqlerrm;
  end;

  begin
    perform public.emit_invoice(
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      '44444444-4444-4444-4444-444444444442',
      '33333333-3333-3333-3333-333333333331',
      '[
        {"product_id":"55555555-5555-5555-5555-555555555552","quantity":12,"unit_price_usd":14.25,"applies_vat":true,"vat_rate":16},
        {"product_id":"55555555-5555-5555-5555-555555555555","quantity":1,"unit_price_usd":25.00,"applies_vat":false,"vat_rate":16}
      ]'::jsonb,
      'Con flete incluido'
    );
  exception when others then
    raise warning 'Factura de ejemplo 2 no creada: %', sqlerrm;
  end;

  begin
    insert into public.payments (
      company_id, invoice_id, payment_date,
      payment_method, payment_currency,
      original_currency_amount, applied_bcv_rate, ves_equivalent_amount,
      applies_igtf, igtf_amount_ves, reference_number
    )
    select
      '11111111-1111-1111-1111-111111111111',
      i.id, now(), 'bank_transfer_ves', 'USD',
      300, i.bcv_rate, round(300 * i.bcv_rate, 2),
      false, 0, 'ABONO-001'
    from public.invoices i
    where i.invoice_number = (select max(invoice_number) from public.invoices
                              where company_id = '11111111-1111-1111-1111-111111111111');

    update public.invoices set status = 'partially_paid'
    where invoice_number = (select max(invoice_number) from public.invoices
                            where company_id = '11111111-1111-1111-1111-111111111111')
      and status = 'issued';
  exception when others then
    raise warning 'Abono de ejemplo no creado: %', sqlerrm;
  end;
end $$;

-- ---------- Diagnóstico: valores permitidos en tu esquema ----------
-- Revisa la pestaña "Messages"/"Notices" del SQL Editor.
do $$
declare
  r record;
begin
  for r in
    select conrelid::regclass as tabla, conname, pg_get_constraintdef(oid) as def
    from pg_constraint
    where connamespace = 'public'::regnamespace and contype = 'c'
    order by conrelid::regclass::text
  loop
    raise notice 'CHECK: % . % => %', r.tabla, r.conname, r.def;
  end loop;
end $$;
