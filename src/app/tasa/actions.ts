"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";

function fail(message: string): never {
  redirect(`/tasa?error=${encodeURIComponent(message)}`);
}

function done(message: string): never {
  redirect(`/tasa?ok=${encodeURIComponent(message)}`);
}

export async function createRate(formData: FormData) {
  const rate_date = String(formData.get("rate_date") ?? "").trim();
  const bcv_rate = Number(formData.get("bcv_rate"));

  if (!rate_date) fail("Indica la fecha de la tasa.");
  if (Number.isNaN(bcv_rate) || bcv_rate <= 0)
    fail("La tasa debe ser un número mayor que cero.");

  const { error } = await supabaseServer().from("exchange_rates").insert({
    rate_date,
    bcv_rate,
    source_currency: "USD",
    target_currency: "VES",
  });

  if (error) {
    if (error.code === "23505")
      fail(`Ya existe una tasa registrada para el ${rate_date}. Edítala o elimínala primero.`);
    fail(`No se pudo registrar la tasa: ${error.message}`);
  }

  done(`Tasa del ${rate_date} registrada: Bs. ${bcv_rate.toFixed(4)} por USD.`);
}

export async function deleteRate(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) fail("Falta identificar la tasa a eliminar.");

  const { error } = await supabaseServer()
    .from("exchange_rates")
    .delete()
    .eq("id", id);

  if (error) fail(`No se pudo eliminar la tasa: ${error.message}`);
  done(`Tasa del ${formData.get("rate_date") ?? ""} eliminada.`);
}
