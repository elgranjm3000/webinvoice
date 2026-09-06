-- =============================================================
-- 005_suppliers_purchases_cash.sql — Pegar en el SQL Editor de Supabase
--   · suppliers          maestro de proveedores
--   · purchase_invoices  compras registradas (libro de compras)
--   · purchase_items     renglones de compra
--   · cash_closes        cierre de caja diario
--   · RPC register_purchase: registra la compra, calcula totales IVA
--     y acredita existencias (kardex PURCHASE_ENTRY) en un solo paso.
--   · RPC close_cash: congela el resumen de pagos del día.
-- =============================================================

create table if not exists public.suppliers (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id),
  id_type         text not null default 'J',
  tax_id          text not null,
  legal_name      text not null,
  fiscal_address  text,
  phone           text,
  email           text,
  is_special_taxpayer boolean not null default false,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (company_id, tax_id)
);

create table if not exists public.purchase_invoices (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id),
  supplier_id     uuid not null references public.suppliers(id),
  invoice_number  text not null,
  control_number  text,
  issue_date      date not null,
  bcv_rate        numeric(12,4) not null,
  exempt_amount_usd numeric(14,2) not null default 0,
  taxable_base_usd  numeric(14,2) not null default 0,
  vat_amount_usd    numeric(14,2) not null default 0,
  total_usd         numeric(14,2) not null default 0,
  exempt_amount_ves numeric(14,2) not null default 0,
  taxable_base_ves  numeric(14,2) not null default 0,
  vat_amount_ves    numeric(14,2) not null default 0,
  total_ves         numeric(14,2) not null default 0,
  status          text not null default 'registered',
  notes           text,
  created_at      timestamptz not null default now()
);

create table if not exists public.purchase_items (
  id              uuid primary key default gen_random_uuid(),
  purchase_id     uuid not null references public.purchase_invoices(id) on delete cascade,
  product_id      uuid references public.products(id),
  product_code    text not null,
  description     text not null,
  quantity        numeric(14,3) not null check (quantity > 0),
  unit_cost_usd   numeric(14,4) not null,
  applies_vat     boolean not null default true,
  vat_rate        numeric(5,2) not null default 16,
  total_amount_usd numeric(14,2) not null,
  total_amount_ves numeric(14,2) not null
);

create table if not exists public.cash_closes (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id),
  close_date      date not null,
  payments_count  integer not null default 0,
  total_ves       numeric(14,2) not null default 0,
  total_igtf_ves  numeric(14,2) not null default 0,
  totals_by_method jsonb not null default '{}'::jsonb,
  notes           text,
  created_at      timestamptz not null default now(),
  unique (company_id, close_date)
);

-- Compra registrada con sus ítems; acredita inventario de una vez.
create or replace function public.register_purchase(
  p_company_id     uuid,
  p_supplier_id    uuid,
  p_invoice_number text,
  p_control_number text default null,
  p_issue_date     date default null,
  p_warehouse_id   uuid default null,
  p_items          jsonb default null,
  p_notes          text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_rate        numeric;
  v_exempt      numeric := 0;
  v_taxable     numeric := 0;
  v_vat         numeric := 0;
  v_total       numeric := 0;
  v_purchase_id uuid;
  v_item        jsonb;
  v_line_total  numeric;
  v_applies     boolean;
  v_rate_line   numeric;
  v_product     record;
  v_prev        numeric;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La compra debe tener al menos un renglón';
  end if;

  select bcv_rate into v_rate
  from public.exchange_rates
  where source_currency = 'USD' and target_currency = 'VES'
  order by rate_date desc
  limit 1;

  if v_rate is null then
    raise exception 'No hay tasa BCV registrada; registre la tasa del día antes de comprar';
  end if;

  -- Pasada 1: validar productos y calcular totales
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.products
    where id = (v_item->>'product_id')::uuid and company_id = p_company_id;
    if not found then
      raise exception 'Producto % no encontrado', v_item->>'product_id';
    end if;
    if (v_item->>'quantity')::numeric <= 0 then
      raise exception 'Cantidad inválida para el producto %', v_product.code;
    end if;
    if (v_item->>'unit_cost_usd')::numeric < 0 then
      raise exception 'Costo inválido para el producto %', v_product.code;
    end if;

    v_line_total := round(
      (v_item->>'quantity')::numeric * (v_item->>'unit_cost_usd')::numeric, 2);
    v_applies   := coalesce((v_item->>'applies_vat')::boolean, v_product.applies_vat);
    v_rate_line := coalesce((v_item->>'vat_rate')::numeric, v_product.vat_rate, 16);

    if v_applies then
      v_taxable := v_taxable + v_line_total;
      v_vat := v_vat + round(v_line_total * v_rate_line / 100, 2);
    else
      v_exempt := v_exempt + v_line_total;
    end if;
  end loop;

  v_total := v_exempt + v_taxable + v_vat;

  insert into public.purchase_invoices (
    company_id, supplier_id, invoice_number, control_number, issue_date, bcv_rate,
    exempt_amount_usd, taxable_base_usd, vat_amount_usd, total_usd,
    exempt_amount_ves, taxable_base_ves, vat_amount_ves, total_ves, notes
  ) values (
    p_company_id, p_supplier_id, p_invoice_number, p_control_number,
    coalesce(p_issue_date, current_date), v_rate,
    v_exempt, v_taxable, v_vat, v_total,
    round(v_exempt * v_rate, 2), round(v_taxable * v_rate, 2),
    round(v_vat * v_rate, 2), round(v_total * v_rate, 2), p_notes
  )
  returning id into v_purchase_id;

  -- Pasada 2: ítems + entrada a inventario
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.products
    where id = (v_item->>'product_id')::uuid and company_id = p_company_id;

    v_line_total := round(
      (v_item->>'quantity')::numeric * (v_item->>'unit_cost_usd')::numeric, 2);
    v_applies   := coalesce((v_item->>'applies_vat')::boolean, v_product.applies_vat);
    v_rate_line := coalesce((v_item->>'vat_rate')::numeric, v_product.vat_rate, 16);

    insert into public.purchase_items (
      purchase_id, product_id, product_code, description, quantity,
      unit_cost_usd, applies_vat, vat_rate,
      total_amount_usd, total_amount_ves
    ) values (
      v_purchase_id, v_product.id, v_product.code,
      coalesce(v_item->>'description', v_product.description),
      (v_item->>'quantity')::numeric, (v_item->>'unit_cost_usd')::numeric,
      v_applies, v_rate_line,
      v_line_total, round(v_line_total * v_rate, 2)
    );

    if not coalesce(v_product.is_service, false) and p_warehouse_id is not null then
      select current_stock into v_prev from public.inventory_stock
      where warehouse_id = p_warehouse_id
        and product_id = v_product.id and company_id = p_company_id
      for update;

      if v_prev is not null then
        update public.inventory_stock
        set current_stock = current_stock + (v_item->>'quantity')::numeric,
            updated_at = now()
        where warehouse_id = p_warehouse_id
          and product_id = v_product.id and company_id = p_company_id;
      else
        insert into public.inventory_stock (
          company_id, warehouse_id, product_id, current_stock
        ) values (
          p_company_id, p_warehouse_id, v_product.id, (v_item->>'quantity')::numeric
        );
        v_prev := 0;
      end if;

      insert into public.inventory_movements (
        company_id, warehouse_id, product_id,
        movement_type, quantity, previous_stock, new_stock,
        unit_cost_usd, notes
      ) values (
        p_company_id, p_warehouse_id, v_product.id,
        'PURCHASE_ENTRY', (v_item->>'quantity')::numeric,
        v_prev,
        v_prev + (v_item->>'quantity')::numeric,
        (v_item->>'unit_cost_usd')::numeric,
        'Compra ' || p_invoice_number
      );
    end if;
  end loop;

  return jsonb_build_object(
    'id', v_purchase_id,
    'invoice_number', p_invoice_number,
    'bcv_rate', v_rate,
    'total_usd', v_total,
    'total_ves', round(v_total * v_rate, 2)
  );
end;
$$;

grant execute on function public.register_purchase to anon, authenticated, service_role;

-- Cierre de caja: congela el resumen de pagos de la fecha indicada.
create or replace function public.close_cash(
  p_company_id uuid,
  p_close_date date default null,
  p_notes      text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_date   date := coalesce(p_close_date, current_date);
  v_count  integer;
  v_total  numeric;
  v_igtf   numeric;
  v_by_method jsonb;
begin
  if exists (
    select 1 from public.cash_closes
    where company_id = p_company_id and close_date = v_date
  ) then
    raise exception 'La caja del % ya está cerrada', v_date;
  end if;

  select count(*), coalesce(sum(ves_equivalent_amount), 0),
         coalesce(sum(igtf_amount_ves), 0)
  into v_count, v_total, v_igtf
  from public.payments
  where company_id = p_company_id
    and payment_date::date = v_date;

  select coalesce(jsonb_object_agg(payment_method, m_total), '{}'::jsonb)
  into v_by_method
  from (
    select payment_method, sum(ves_equivalent_amount) as m_total
    from public.payments
    where company_id = p_company_id and payment_date::date = v_date
    group by payment_method
  ) s;

  insert into public.cash_closes (
    company_id, close_date, payments_count,
    total_ves, total_igtf_ves, totals_by_method, notes
  ) values (
    p_company_id, v_date, v_count, v_total, v_igtf, v_by_method, p_notes
  );

  return jsonb_build_object(
    'close_date', v_date,
    'payments_count', v_count,
    'total_ves', v_total,
    'total_igtf_ves', v_igtf,
    'totals_by_method', v_by_method
  );
end;
$$;

grant execute on function public.close_cash to anon, authenticated, service_role;
