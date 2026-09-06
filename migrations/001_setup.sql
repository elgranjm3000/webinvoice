-- =============================================================
-- 001_setup.sql — Permisos + emisión atómica de facturas
-- Compatible con los triggers fiscales del esquema:
--   · prevent_invoice_modification (prohíbe UPDATE/DELETE de facturas issued)
--   · deduct_inventory_on_invoice  (inoperativo: los ítems se insertan después)
-- La factura se inserta UNA sola vez, ya con todos los totales.
-- =============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;

create or replace function public.emit_invoice(
  p_company_id        uuid,
  p_emission_point_id uuid,
  p_customer_id       uuid,
  p_warehouse_id      uuid,
  p_items             jsonb,
  p_notes             text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_ep          public.emission_points%rowtype;
  v_rate        numeric;
  v_seq         integer;
  v_ctrl_seq    integer;
  v_invoice_id  uuid;
  v_exempt      numeric := 0;
  v_taxable     numeric := 0;
  v_vat         numeric := 0;
  v_total       numeric := 0;
  v_item        jsonb;
  v_line_total  numeric;
  v_line_vat    numeric;
  v_applies     boolean;
  v_rate_line   numeric;
  v_product     record;
  v_stock       record;
begin
  -- Bloquear el punto de emisión: garantiza numeración única
  select * into v_ep
  from public.emission_points
  where id = p_emission_point_id and company_id = p_company_id and is_active
  for update;

  if not found then
    raise exception 'Punto de emisión no encontrado o inactivo';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'La factura debe tener al menos un ítem';
  end if;

  -- Tasa BCV vigente
  select bcv_rate into v_rate
  from public.exchange_rates
  where source_currency = 'USD' and target_currency = 'VES'
  order by rate_date desc
  limit 1;

  if v_rate is null then
    raise exception 'No hay tasa BCV registrada; registre la tasa del día antes de facturar';
  end if;

  -- Pasada 1: validar productos y calcular TODOS los totales
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

    v_line_total := round(
      (v_item->>'quantity')::numeric * (v_item->>'unit_price_usd')::numeric, 2);
    v_applies := coalesce((v_item->>'applies_vat')::boolean, v_product.applies_vat);
    v_rate_line := coalesce((v_item->>'vat_rate')::numeric, v_product.vat_rate, 16);

    if v_applies then
      v_taxable := v_taxable + v_line_total;
      v_vat := v_vat + round(v_line_total * v_rate_line / 100, 2);
    else
      v_exempt := v_exempt + v_line_total;
    end if;
  end loop;

  v_total := v_exempt + v_taxable + v_vat;

  -- Números del punto de emisión (reservados antes del INSERT)
  v_seq := coalesce(v_ep.last_invoice_number, 0) + 1;
  v_ctrl_seq := coalesce(v_ep.last_control_number, 0) + 1;
  update public.emission_points
  set last_invoice_number = v_seq,
      last_control_number = v_ctrl_seq
  where id = v_ep.id;

  -- INSERT único: la factura nace con status issued y todos sus totales.
  -- Nunca se vuelve a actualizar (trigger de inviolabilidad fiscal).
  insert into public.invoices (
    company_id, emission_point_id, customer_id, document_type,
    invoice_number, control_number, issue_date, bcv_rate,
    exempt_amount_usd, taxable_base_usd, vat_amount_usd, total_usd,
    exempt_amount_ves, taxable_base_ves, vat_amount_ves, total_ves,
    status, notes
  ) values (
    p_company_id, p_emission_point_id, p_customer_id, 'invoice',
    lpad(v_seq::text, 6, '0'),
    coalesce(v_ep.control_number_prefix, '00') || '-' || lpad(v_ctrl_seq::text, 8, '0'),
    now(), v_rate,
    v_exempt, v_taxable, v_vat, v_total,
    round(v_exempt * v_rate, 2), round(v_taxable * v_rate, 2),
    round(v_vat * v_rate, 2), round(v_total * v_rate, 2),
    'issued', p_notes
  )
  returning id into v_invoice_id;

  -- Pasada 2: ítems + descarga de inventario (el trigger del esquema
  -- no descuenta porque los ítems no existen al momento del INSERT)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.products
    where id = (v_item->>'product_id')::uuid and company_id = p_company_id;

    v_line_total := round(
      (v_item->>'quantity')::numeric * (v_item->>'unit_price_usd')::numeric, 2);
    v_applies := coalesce((v_item->>'applies_vat')::boolean, v_product.applies_vat);
    v_rate_line := coalesce((v_item->>'vat_rate')::numeric, v_product.vat_rate, 16);

    insert into public.invoice_items (
      invoice_id, product_id, warehouse_id,
      product_code, description, quantity,
      unit_price_usd, applies_vat, vat_rate,
      total_amount_usd, total_amount_ves
    ) values (
      v_invoice_id, v_product.id, p_warehouse_id,
      v_product.code, coalesce(v_item->>'description', v_product.description),
      (v_item->>'quantity')::numeric,
      (v_item->>'unit_price_usd')::numeric,
      v_applies, v_rate_line,
      v_line_total, round(v_line_total * v_rate, 2)
    );

    if not coalesce(v_product.is_service, false) then
      select * into v_stock from public.inventory_stock
      where warehouse_id = p_warehouse_id
        and product_id = v_product.id and company_id = p_company_id
      for update;

      if not found then
        raise exception 'El producto % no tiene existencias en el almacén indicado',
          v_product.code;
      end if;
      if v_stock.current_stock < (v_item->>'quantity')::numeric then
        raise exception 'Existencias insuficientes de % (disponible: %)',
          v_product.code, v_stock.current_stock;
      end if;

      update public.inventory_stock
      set current_stock = current_stock - (v_item->>'quantity')::numeric,
          updated_at = now()
      where id = v_stock.id;

      insert into public.inventory_movements (
        company_id, warehouse_id, product_id,
        movement_type, quantity, previous_stock, new_stock,
        invoice_id, unit_cost_usd, notes
      ) values (
        p_company_id, p_warehouse_id, v_product.id,
        'SALE_EXIT', (v_item->>'quantity')::numeric,
        v_stock.current_stock,
        v_stock.current_stock - (v_item->>'quantity')::numeric,
        v_invoice_id, null, 'Venta por factura ' || lpad(v_seq::text, 6, '0')
      );
    end if;
  end loop;

  return jsonb_build_object(
    'id', v_invoice_id,
    'invoice_number', lpad(v_seq::text, 6, '0'),
    'control_number', coalesce(v_ep.control_number_prefix, '00') || '-' || lpad(v_ctrl_seq::text, 8, '0'),
    'bcv_rate', v_rate,
    'total_usd', v_total,
    'total_ves', round(v_total * v_rate, 2)
  );
end;
$$;

grant execute on function public.emit_invoice to anon, authenticated, service_role;
