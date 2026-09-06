-- =============================================================
-- 003_void.sql — Pegar en el SQL Editor de Supabase
-- Anula una factura y revierte su efecto sobre el inventario.
-- Solo admite facturas no pagadas; si está pagada debe
-- tramitarse como nota de crédito.
-- =============================================================

create or replace function public.void_invoice(
  p_company_id uuid,
  p_invoice_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_invoice record;
  v_item    record;
  v_stock   record;
begin
  select * into v_invoice
  from public.invoices
  where id = p_invoice_id and company_id = p_company_id
  for update;

  if not found then
    raise exception 'Factura no encontrada';
  end if;
  if v_invoice.status = 'anulada' then
    raise exception 'La factura ya está anulada';
  end if;
  if v_invoice.status = 'pagada' then
    raise exception 'La factura está pagada; debe tramitarse como nota de crédito';
  end if;

  for v_item in
    select * from public.invoice_items where invoice_id = p_invoice_id
  loop
    if exists (select 1 from public.products p
               where p.id = v_item.product_id and not coalesce(p.is_service, false)) then
      select * into v_stock from public.inventory_stock
      where warehouse_id = v_item.warehouse_id
        and product_id = v_item.product_id
        and company_id = p_company_id
      for update;

      if found then
        update public.inventory_stock
        set current_stock = current_stock + v_item.quantity,
            updated_at = now()
        where id = v_stock.id;
      else
        insert into public.inventory_stock (
          company_id, warehouse_id, product_id, current_stock
        ) values (
          p_company_id, v_item.warehouse_id, v_item.product_id, v_item.quantity
        );
      end if;

      insert into public.inventory_movements (
        company_id, warehouse_id, product_id,
        movement_type, quantity, previous_stock, new_stock,
        invoice_id, notes
      ) values (
        p_company_id, v_item.warehouse_id, v_item.product_id,
        'RETURN', v_item.quantity,
        coalesce(v_stock.current_stock, 0),
        coalesce(v_stock.current_stock, 0) + v_item.quantity,
        p_invoice_id,
        'Reversa por anulación de factura ' || v_invoice.invoice_number
      );
    end if;
  end loop;

  update public.invoices set status = 'anulada' where id = p_invoice_id;

  return jsonb_build_object('status', 'anulada');
end;
$$;

grant execute on function public.void_invoice to anon, authenticated, service_role;
