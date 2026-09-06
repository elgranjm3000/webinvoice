-- =============================================================
-- 006_emit_debit_note.sql — Pegar en el SQL Editor de Supabase
-- Nota de débito sobre una factura emitida: aumenta el monto adeudado
-- (cargos adicionales de renglones ya facturados). No toca inventario.
-- =============================================================

create or replace function public.emit_debit_note(
  p_company_id        uuid,
  p_invoice_id        uuid,
  p_emission_point_id uuid,
  p_warehouse_id      uuid default null,
  p_items             jsonb default null,
  p_notes             text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_ep       public.emission_points%rowtype;
  v_src      public.invoices%rowtype;
  v_rate     numeric;
  v_seq      integer;
  v_ctrl_seq integer;
  v_note_id  uuid;
  v_exempt   numeric := 0;
  v_taxable  numeric := 0;
  v_vat      numeric := 0;
  v_total    numeric := 0;
  v_item     jsonb;
  v_line     record;
begin
  select * into v_src from public.invoices
  where id = p_invoice_id and company_id = p_company_id and document_type = 'invoice'
  for update;
  if not found then
    raise exception 'Factura afectada no encontrada';
  end if;
  if v_src.status = 'voided' then
    raise exception 'La factura está anulada; no admite notas de débito';
  end if;

  select * into v_ep from public.emission_points
  where id = p_emission_point_id and company_id = p_company_id and is_active
  for update;
  if not found then
    raise exception 'Punto de emisión no encontrado o inactivo';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La nota debe cargar al menos un ítem';
  end if;

  select bcv_rate into v_rate from public.exchange_rates
  where source_currency = 'USD' and target_currency = 'VES'
  order by rate_date desc limit 1;
  if v_rate is null then
    raise exception 'No hay tasa BCV registrada; registre la tasa del día';
  end if;

  -- Pasada 1: validar contra los renglones de la factura y calcular totales
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_line from public.invoice_items
    where invoice_id = p_invoice_id and product_id = (v_item->>'product_id')::uuid;
    if not found then
      raise exception 'El producto % no pertenece a la factura', v_item->>'product_id';
    end if;
    if (v_item->>'quantity')::numeric <= 0 then
      raise exception 'Cantidad inválida';
    end if;
    if (v_item->>'quantity')::numeric > v_line.quantity then
      raise exception 'No puedes cargar más de lo facturado de % (facturado: %)',
        v_line.product_code, v_line.quantity;
    end if;
  end loop;

  -- Totales con los precios congelados de la factura
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_line from public.invoice_items
    where invoice_id = p_invoice_id and product_id = (v_item->>'product_id')::uuid;
    if v_line.applies_vat then
      v_taxable := v_taxable + round((v_item->>'quantity')::numeric * v_line.unit_price_usd, 2);
      v_vat := v_vat + round(round((v_item->>'quantity')::numeric * v_line.unit_price_usd, 2) * v_line.vat_rate / 100, 2);
    else
      v_exempt := v_exempt + round((v_item->>'quantity')::numeric * v_line.unit_price_usd, 2);
    end if;
  end loop;
  v_total := v_exempt + v_taxable + v_vat;

  -- Numeración propia de notas de débito
  v_seq := coalesce(v_ep.last_debit_note_number, 0) + 1;
  v_ctrl_seq := coalesce(v_ep.last_control_number, 0) + 1;
  update public.emission_points
  set last_debit_note_number = v_seq, last_control_number = v_ctrl_seq
  where id = v_ep.id;

  insert into public.invoices (
    company_id, emission_point_id, customer_id, document_type, affected_invoice_id,
    invoice_number, control_number, issue_date, bcv_rate,
    exempt_amount_usd, taxable_base_usd, vat_amount_usd, total_usd,
    exempt_amount_ves, taxable_base_ves, vat_amount_ves, total_ves,
    status, notes
  ) values (
    p_company_id, p_emission_point_id, v_src.customer_id, 'debit_note', p_invoice_id,
    'ND-' || lpad(v_seq::text, 6, '0'),
    coalesce(v_ep.control_number_prefix, '00') || '-' || lpad(v_ctrl_seq::text, 8, '0'),
    now(), v_rate,
    v_exempt, v_taxable, v_vat, v_total,
    round(v_exempt * v_rate, 2), round(v_taxable * v_rate, 2),
    round(v_vat * v_rate, 2), round(v_total * v_rate, 2),
    'issued',
    coalesce(p_notes, 'Nota de débito de la factura ' || v_src.invoice_number)
  ) returning id into v_note_id;

  -- Pasada 2: renglones (precio congelado de la factura). Sin movimiento
  -- de inventario: la ND no devuelve ni retira mercancía.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_line from public.invoice_items
    where invoice_id = p_invoice_id and product_id = (v_item->>'product_id')::uuid;

    insert into public.invoice_items (
      invoice_id, product_id, warehouse_id,
      product_code, description, quantity,
      unit_price_usd, applies_vat, vat_rate,
      total_amount_usd, total_amount_ves
    ) values (
      v_note_id, v_line.product_id, p_warehouse_id,
      v_line.product_code, v_line.description,
      (v_item->>'quantity')::numeric,
      v_line.unit_price_usd, v_line.applies_vat, v_line.vat_rate,
      round((v_item->>'quantity')::numeric * v_line.unit_price_usd, 2),
      round((v_item->>'quantity')::numeric * v_line.unit_price_usd * v_rate, 2)
    );
  end loop;

  return jsonb_build_object(
    'id', v_note_id,
    'invoice_number', 'ND-' || lpad(v_seq::text, 6, '0'),
    'control_number', coalesce(v_ep.control_number_prefix, '00') || '-' || lpad(v_ctrl_seq::text, 8, '0'),
    'bcv_rate', v_rate,
    'total_usd', v_total,
    'total_ves', round(v_total * v_rate, 2)
  );
end;
$$;

grant execute on function public.emit_debit_note to anon, authenticated, service_role;
