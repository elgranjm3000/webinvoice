"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";

export type PurchaseResult =
  | { ok: true; id: string; invoice_number: string; total_usd: number; total_ves: number }
  | { ok: false; error: string };

export async function registerPurchase(input: {
  supplier_id: string;
  invoice_number: string;
  control_number?: string;
  issue_date?: string;
  warehouse_id: string;
  items: { product_id: string; quantity: number; unit_cost_usd: number }[];
  notes?: string;
}): Promise<PurchaseResult> {
  const sb = supabaseServer();

  const { data: company } = await sb
    .from("companies")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!company) return { ok: false, error: "No hay una empresa activa registrada." };
  if (input.items.length === 0)
    return { ok: false, error: "Indica al menos un producto con cantidad y costo." };

  const { data, error } = await sb.rpc("register_purchase", {
    p_company_id: company.id,
    p_supplier_id: input.supplier_id,
    p_invoice_number: input.invoice_number,
    p_control_number: input.control_number || null,
    p_issue_date: input.issue_date || null,
    p_warehouse_id: input.warehouse_id,
    p_items: input.items,
    p_notes: input.notes ?? null,
  });

  if (error) return { ok: false, error: error.message };
  const r = data as {
    id: string;
    invoice_number: string;
    total_usd: number;
    total_ves: number;
  };
  return { ok: true, ...r };
}
