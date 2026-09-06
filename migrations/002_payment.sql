-- =============================================================
-- 002_payment.sql — Pegar en el SQL Editor de Supabase
-- Registra un pago contra una factura y liquida su saldo.
-- El IGTF (3%) se calcula cuando el pago es en efectivo en
-- divisas, según los parámetros que envía la aplicación.
-- =============================================================

create or replace function public.register_payment(
  p_company_id              uuid,
  p_invoice_id              uuid,
  p_payment_method          text,     -- 'punto_de_venta','transferencia','efectivo_usd','zelle','pago_movil','otro'
  p_payment_currency        text,     -- 'USD' o 'VES'
  p_original_currency_amount numeric,
  p_applies_igtf            boolean default false,
  p_reference               text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_invoice     record;
  v_rate        numeric;
  v_ves         numeric;
  v_igtf        numeric := 0;
  v_paid        numeric;
  v_payment_id  uuid;
begin
  select * into v_invoice
  from public.invoices
  where id = p_invoice_id and company_id = p_company_id
  for update;

  if not found then
    raise exception 'Factura no encontrada';
  end if;
  if v_invoice.status = 'anulada' then
    raise exception 'No se puede pagar una factura anulada';
  end if;
  if v_invoice.status = 'pagada' then
    raise exception 'La factura ya está pagada';
  end if;

  -- Tasa aplicada: la del pago si viene en VES; la de la factura si venía en USD
  if p_payment_currency = 'VES' then
    v_rate := 1;
  else
    v_rate := v_invoice.bcv_rate;
  end if;

  v_ves := round(p_original_currency_amount * v_rate, 2);

  if p_applies_igtf then
    v_igtf := round(v_ves * 0.03, 2);
    v_ves  := v_ves + v_igtf;
  end if;

  insert into public.payments (
    company_id, invoice_id, payment_date,
    payment_method, payment_currency,
    original_currency_amount, applied_bcv_rate, ves_equivalent_amount,
    applies_igtf, igtf_amount_ves, reference_number
  ) values (
    p_company_id, p_invoice_id, now(),
    p_payment_method, p_payment_currency,
    p_original_currency_amount, v_rate, v_ves,
    p_applies_igtf, v_igtf, p_reference
  )
  returning id into v_payment_id;

  -- Saldo pagado y liquidación
  select coalesce(sum(ves_equivalent_amount), 0) into v_paid
  from public.payments
  where invoice_id = p_invoice_id;

  if v_paid >= v_invoice.total_ves then
    update public.invoices set status = 'fully_paid' where id = p_invoice_id;
  end if;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'ves_amount', v_ves,
    'igtf_amount_ves', v_igtf,
    'paid_total_ves', v_paid,
    'remaining_ves', greatest(v_invoice.total_ves - v_paid, 0),
    'invoice_status', case when v_paid >= v_invoice.total_ves then 'fully_paid' else 'partially_paid' end
  );
end;
$$;

grant execute on function public.register_payment to anon, authenticated, service_role;
