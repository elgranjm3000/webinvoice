"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";

export async function closeCash(formData: FormData) {
  const fecha = String(formData.get("fecha") ?? "").trim();

  const { data: company } = await supabaseServer()
    .from("companies")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!company) {
    redirect(`/cierre?error=${encodeURIComponent("No hay una empresa activa registrada.")}`);
  }

  const { data, error } = await supabaseServer().rpc("close_cash", {
    p_company_id: company.id,
    p_close_date: fecha || null,
    p_notes: String(formData.get("notas") ?? "").trim() || null,
  });

  if (error) {
    redirect(`/cierre?error=${encodeURIComponent(error.message)}`);
  }

  const r = data as { close_date: string; total_ves: number; payments_count: number };
  redirect(
    `/cierre?ok=${encodeURIComponent(
      `Caja del ${r.close_date} cerrada: ${r.payments_count} pago(s) por Bs. ${Number(r.total_ves).toFixed(2)}.`
    )}`
  );
}
