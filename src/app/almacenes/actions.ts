"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";

function fail(message: string): never {
  redirect(`/almacenes?error=${encodeURIComponent(message)}`);
}

function done(message: string): never {
  redirect(`/almacenes?ok=${encodeURIComponent(message)}`);
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

export async function createWarehouse(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const is_main = formData.get("is_main") === "on";

  if (!code) fail("Indica el código del almacén (ej. ALM-01).");
  if (!name) fail("Indica el nombre del almacén.");

  const company_id = await activeCompanyId();
  if (!company_id) fail("No hay una empresa activa registrada.");

  if (is_main) {
    await supabaseServer()
      .from("warehouses")
      .update({ is_main: false })
      .eq("company_id", company_id);
  }

  const { error } = await supabaseServer().from("warehouses").insert({
    company_id,
    code,
    name,
    address: String(formData.get("address") ?? "").trim() || null,
    is_main,
    is_active: formData.get("is_active") === "on",
  });

  if (error) {
    if (error.code === "23505")
      fail(`Ya existe un almacén con código ${code}.`);
    fail(`No se pudo registrar el almacén: ${error.message}`);
  }

  done(`Almacén «${name}» registrado.`);
}

export async function updateWarehouse(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const is_main = formData.get("is_main") === "on";

  if (!id) fail("Falta identificar el almacén a actualizar.");
  if (!code) fail("Indica el código del almacén.");
  if (!name) fail("Indica el nombre del almacén.");

  const { data: current } = await supabaseServer()
    .from("warehouses")
    .select("company_id")
    .eq("id", id)
    .maybeSingle();
  if (!current) fail("No se encontró el almacén.");

  if (is_main) {
    await supabaseServer()
      .from("warehouses")
      .update({ is_main: false })
      .eq("company_id", current.company_id);
  }

  const { error } = await supabaseServer()
    .from("warehouses")
    .update({
      code,
      name,
      address: String(formData.get("address") ?? "").trim() || null,
      is_main,
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505")
      fail(`Ya existe otro almacén con código ${code}.`);
    fail(`No se pudo actualizar el almacén: ${error.message}`);
  }

  done(`Almacén «${name}» actualizado.`);
}

export async function deleteWarehouse(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "almacén");
  if (!id) fail("Falta identificar el almacén a eliminar.");

  const { count, error } = await supabaseServer()
    .from("invoice_items")
    .select("id", { count: "exact", head: true })
    .eq("warehouse_id", id);

  if (error) fail(`No se pudo verificar el uso del almacén: ${error.message}`);
  if ((count ?? 0) > 0)
    fail(
      `No se puede eliminar «${name}»: tiene ${count} línea(s) de factura asociadas. Desactívalo en su lugar.`
    );

  const { error: delError } = await supabaseServer()
    .from("warehouses")
    .delete()
    .eq("id", id);

  if (delError) fail(`No se pudo eliminar el almacén: ${delError.message}`);
  done(`Almacén «${name}» eliminado.`);
}
