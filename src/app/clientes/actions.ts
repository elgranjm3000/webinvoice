"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";

function fail(message: string): never {
  redirect(`/clientes?error=${encodeURIComponent(message)}`);
}

function done(message: string): never {
  redirect(`/clientes?ok=${encodeURIComponent(message)}`);
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

export async function createCustomer(formData: FormData) {
  const legal_name = String(formData.get("legal_name") ?? "").trim();
  const id_type = String(formData.get("id_type") ?? "").trim();
  const tax_id = String(formData.get("tax_id") ?? "").trim().toUpperCase();

  if (!legal_name) fail("Indica la razón social del cliente.");
  if (!/^[VEJGP]$/.test(id_type)) fail("Selecciona el tipo de RIF (V, E, J, G o P).");
  if (!tax_id) fail("Indica el número de RIF.");

  const company_id = await activeCompanyId();
  if (!company_id) fail("No hay una empresa activa registrada.");

  const { error } = await supabaseServer().from("customers").insert({
    company_id,
    id_type,
    tax_id,
    legal_name,
    fiscal_address: String(formData.get("fiscal_address") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    is_special_taxpayer: formData.get("is_special_taxpayer") === "on",
  });

  if (error) {
    if (error.code === "23505") {
      fail(`Ya existe un cliente con RIF ${id_type}-${tax_id}.`);
    }
    fail(`No se pudo registrar el cliente: ${error.message}`);
  }

  done(`Cliente «${legal_name}» registrado.`);
}

export async function deleteCustomer(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const legal_name = String(formData.get("legal_name") ?? "cliente");
  if (!id) fail("Falta identificar el cliente a eliminar.");

  const { error } = await supabaseServer()
    .from("customers")
    .delete()
    .eq("id", id);

  if (error) {
    if (error.code === "23503") {
      fail(
        `No se puede eliminar «${legal_name}»: tiene facturas asociadas. Anúlalas o elimínalas primero.`
      );
    }
    fail(`No se pudo eliminar el cliente: ${error.message}`);
  }

  done(`Cliente «${legal_name}» eliminado.`);
}

export async function updateCustomer(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const legal_name = String(formData.get("legal_name") ?? "").trim();
  const id_type = String(formData.get("id_type") ?? "").trim();
  const tax_id = String(formData.get("tax_id") ?? "").trim().toUpperCase();

  if (!id) fail("Falta identificar el cliente a actualizar.");
  if (!legal_name) fail("Indica la razón social del cliente.");
  if (!/^[VEJGP]$/.test(id_type)) fail("Selecciona el tipo de RIF (V, E, J, G o P).");
  if (!tax_id) fail("Indica el número de RIF.");

  const { error } = await supabaseServer()
    .from("customers")
    .update({
      id_type,
      tax_id,
      legal_name,
      fiscal_address: String(formData.get("fiscal_address") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      is_special_taxpayer: formData.get("is_special_taxpayer") === "on",
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      fail(`Ya existe otro cliente con RIF ${id_type}-${tax_id}.`);
    }
    fail(`No se pudo actualizar el cliente: ${error.message}`);
  }

  done(`Cliente «${legal_name}» actualizado.`);
}
