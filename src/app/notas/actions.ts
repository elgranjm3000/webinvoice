"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { voidInvoice } from "@/app/facturas/actions";

export type CreditNoteResult =
  | { ok: true; id?: string; invoice_number: string; control_number: string; total_usd: number; total_ves: number }
  | { ok: false; error: string };

export async function emitCreditNote(input: {
  invoice_id: string;
  emission_point_id: string;
  warehouse_id: string;
  items: { product_id: string; quantity: number }[];
  notes?: string;
}): Promise<CreditNoteResult> {
  const sb = supabaseServer();

  const { data: company } = await sb
    .from("companies")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!company) return { ok: false, error: "No hay una empresa activa registrada." };
  if (input.items.length === 0)
    return { ok: false, error: "Indica al menos un producto a acreditar." };

  const { data, error } = await sb.rpc("emit_credit_note", {
    p_company_id: company.id,
    p_invoice_id: input.invoice_id,
    p_emission_point_id: input.emission_point_id,
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
    id?: string;
  };
  return { ok: true, ...r };
}

export type DebitNoteResult =
  | { ok: true; id?: string; invoice_number: string; control_number: string; total_usd: number; total_ves: number }
  | { ok: false; error: string };

export async function emitDebitNote(input: {
  invoice_id: string;
  emission_point_id: string;
  warehouse_id?: string;
  items: { product_id: string; quantity: number }[];
  notes?: string;
}): Promise<DebitNoteResult> {
  const sb = supabaseServer();

  const { data: company } = await sb
    .from("companies")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!company) return { ok: false, error: "No hay una empresa activa registrada." };
  if (input.items.length === 0)
    return { ok: false, error: "Indica al menos un producto a cargar." };

  const { data, error } = await sb.rpc("emit_debit_note", {
    p_company_id: company.id,
    p_invoice_id: input.invoice_id,
    p_emission_point_id: input.emission_point_id,
    p_warehouse_id: input.warehouse_id ?? null,
    p_items: input.items,
    p_notes: input.notes ?? null,
  });

  if (error) return { ok: false, error: error.message };
  const r = data as {
    invoice_number: string;
    control_number: string;
    total_usd: number;
    total_ves: number;
    id?: string;
  };
  return { ok: true, ...r };
}

export async function voidCreditNote(
  invoiceId: string
): Promise<{ ok: boolean; error?: string }> {
  return voidInvoice(invoiceId);
}

export async function selectInvoiceForNote(formData: FormData) {
  const invoice_id = String(formData.get("invoice_id") ?? "");
  const emission_point_id = String(formData.get("emission_point_id") ?? "");
  const warehouse_id = String(formData.get("warehouse_id") ?? "");

  if (!invoice_id) {
    redirect(
      `/notas/nueva?error=${encodeURIComponent("Selecciona la factura a acreditar.")}`
    );
  }
  redirect(
    `/notas/nueva?factura=${invoice_id}&pe=${emission_point_id}&alm=${warehouse_id}`
  );
}
