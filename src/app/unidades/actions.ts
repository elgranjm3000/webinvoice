"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";

function fail(message: string): never {
  redirect(`/unidades?error=${encodeURIComponent(message)}`);
}

function done(message: string): never {
  redirect(`/unidades?ok=${encodeURIComponent(message)}`);
}

async function activeCompanyId(): Promise<string | null> {
  const { data } = await supabaseServer()
    .from("companies")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function createUnit(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();

  if (!code) fail("Indica el código de la unidad (ej. UND, KG).");
  if (!name) fail("Indica el nombre de la unidad.");

  const company_id = await activeCompanyId();
  if (!company_id) fail("No hay una empresa activa registrada.");

  const { error } = await supabaseServer()
    .from("units_of_measure")
    .insert({ company_id, code, name });

  if (error) {
    if (error.code === "23505")
      fail(`Ya existe una unidad con código ${code}.`);
    fail(`No se pudo registrar la unidad: ${error.message}`);
  }

  done(`Unidad «${name}» registrada.`);
}

export async function updateUnit(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();

  if (!id) fail("Falta identificar la unidad a actualizar.");
  if (!code) fail("Indica el código de la unidad.");
  if (!name) fail("Indica el nombre de la unidad.");

  const { error } = await supabaseServer()
    .from("units_of_measure")
    .update({ code, name })
    .eq("id", id);

  if (error) {
    if (error.code === "23505")
      fail(`Ya existe otra unidad con código ${code}.`);
    fail(`No se pudo actualizar la unidad: ${error.message}`);
  }

  done(`Unidad «${name}» actualizada.`);
}

export async function deleteUnit(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "unidad");
  if (!id) fail("Falta identificar la unidad a eliminar.");

  const { count, error } = await supabaseServer()
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("unit_of_measure", String(formData.get("code") ?? ""));

  if (error) fail(`No se pudo verificar el uso de la unidad: ${error.message}`);
  if ((count ?? 0) > 0)
    fail(
      `No se puede eliminar «${name}»: ${count} producto(s) la usan. Cámbialos a otra unidad primero.`
    );

  const { error: delError } = await supabaseServer()
    .from("units_of_measure")
    .delete()
    .eq("id", id);

  if (delError) fail(`No se pudo eliminar la unidad: ${delError.message}`);
  done(`Unidad «${name}» eliminada.`);
}
