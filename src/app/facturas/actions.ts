"use server";

import { supabaseServer } from "@/lib/supabase";

export type EmitResult =
  | { ok: true; id?: string; invoice_number: string; control_number: string; total_usd: number; total_ves: number }
  | { ok: false; error: string };

export type LineItem = {
  product_id: string;
  quantity: number;
  unit_price_usd: number;
  applies_vat: boolean;
  vat_rate: number;
};

export async function emitInvoice(input: {
  emission_point_id: string;
  customer_id: string;
  warehouse_id: string;
  items: LineItem[];
  notes?: string;
}): Promise<EmitResult> {
  const sb = supabaseServer();

  const { data: company } = await sb
    .from("companies")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!company) {
    return { ok: false, error: "No hay una empresa activa registrada." };
  }

  if (input.items.length === 0) {
    return { ok: false, error: "Agrega al menos un producto a la factura." };
  }

  const { data, error } = await sb.rpc("emit_invoice", {
    p_company_id: company.id,
    p_emission_point_id: input.emission_point_id,
    p_customer_id: input.customer_id,
    p_warehouse_id: input.warehouse_id,
    p_items: input.items,
    p_notes: input.notes ?? null,
  });

  if (error) return { ok: false, error: error.message };
  const r = data as {
    invoice_number: string;
    control_number: string;
    total_usd: number;
    total_ves: number;
  };
  return { ok: true, ...r };
}

export type PaymentResult =
  | {
      ok: true;
      ves_amount: number;
      igtf_amount_ves: number;
      remaining_ves: number;
      invoice_status: string;
    }
  | { ok: false; error: string };

export async function registerPayment(input: {
  invoice_id: string;
  payment_method: string;
  payment_currency: string;
  amount: number;
  applies_igtf: boolean;
  reference?: string;
}): Promise<PaymentResult> {
  const sb = supabaseServer();

  const { data: company } = await sb
    .from("companies")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!company) {
    return { ok: false, error: "No hay una empresa activa registrada." };
  }

  const { data, error } = await sb.rpc("register_payment", {
    p_company_id: company.id,
    p_invoice_id: input.invoice_id,
    p_payment_method: input.payment_method,
    p_payment_currency: input.payment_currency,
    p_original_currency_amount: input.amount,
    p_applies_igtf: input.applies_igtf,
    p_reference: input.reference ?? null,
  });

  if (error) return { ok: false, error: error.message };
  const r = data as {
    ves_amount: number;
    igtf_amount_ves: number;
    remaining_ves: number;
    invoice_status: string;
  };
  return { ok: true, ...r };
}

export async function voidInvoice(
  invoiceId: string
): Promise<{ ok: boolean; error?: string }> {
  const sb = supabaseServer();

  const { data: company } = await sb
    .from("companies")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!company) return { ok: false, error: "No hay una empresa activa registrada." };

  const { error } = await sb.rpc("void_invoice", {
    p_company_id: company.id,
    p_invoice_id: invoiceId,
  });

  return error ? { ok: false, error: error.message } : { ok: true };
}

export type RetentionInput = {
  invoice_id: string;
  kind: "iva" | "islr";
  voucher_number: string;
  voucher_date: string;
  retention_percentage: number;
  taxable_base_ves: number;
  vat_amount_ves?: number;
  seniat_concept_code?: string;
};

export async function registerRetention(
  input: RetentionInput
): Promise<{ ok: boolean; retained?: number; error?: string }> {
  const sb = supabaseServer();

  const { data: company } = await sb
    .from("companies")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!company) return { ok: false, error: "No hay una empresa activa registrada." };

  const retained =
    Math.round(input.taxable_base_ves * input.retention_percentage) / 100;

  const base = {
    company_id: company.id,
    invoice_id: input.invoice_id,
    voucher_number: input.voucher_number,
    voucher_date: input.voucher_date,
    fiscal_period: input.voucher_date.slice(0, 7).replace("-", ""),
    retention_percentage: input.retention_percentage,
    taxable_base_ves: input.taxable_base_ves,
    retained_amount_ves: retained,
  };

  const { error } =
    input.kind === "iva"
      ? await sb.from("vat_retentions").insert({
          ...base,
          retention_type: "issued",
          vat_amount_ves: input.vat_amount_ves ?? 0,
        })
      : await sb.from("islr_retentions").insert({
          ...base,
          seniat_concept_code: input.seniat_concept_code ?? "",
        });

  return error ? { ok: false, error: error.message } : { ok: true, retained };
}
