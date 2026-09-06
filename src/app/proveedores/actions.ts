"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";

function fail(message: string): never {
  redirect(`/proveedores?error=${encodeURIComponent(message)}`);
}

function done(message: string): never {
  redirect(`/proveedores?ok=${encodeURIComponent(message)}`);
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

function readSupplier(formData: FormData) {
  return {
    legal_name: String(formData.get("legal_name") ?? "").trim(),
    id_type: String(formData.get("id_type") ?? "").trim(),
    tax_id: String(formData.get("tax_id") ?? "").trim().toUpperCase(),
    fiscal_address: String(formData.get("fiscal_address") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    is_special_taxpayer: formData.get("is_special_taxpayer") === "on",
  };
}

export async function createSupplier(formData: FormData) {
  const s = readSupplier(formData);
  if (!s.legal_name) fail("Indica la razón social del proveedor.");
  if (!/^[VEJGP]$/.test(s.id_type)) fail("Selecciona el tipo de RIF (V, E, J, G o P).");
  if (!s.tax_id) fail("Indica el número de RIF.");

  const company_id = await activeCompanyId();
  if (!company_id) fail("No hay una empresa activa registrada.");

  const { error } = await supabaseServer()
    .from("suppliers")
    .insert({ company_id, ...s });

  if (error) {
    if (error.code === "23505") {
      fail(`Ya existe un proveedor con RIF ${s.id_type}-${s.tax_id}.`);
    }
    fail(`No se pudo registrar el proveedor: ${error.message}`);
  }

  done(`Proveedor «${s.legal_name}» registrado.`);
}

export async function updateSupplier(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const s = readSupplier(formData);
  if (!id) fail("Falta identificar el proveedor a actualizar.");
  if (!s.legal_name) fail("Indica la razón social del proveedor.");
  if (!/^[VEJGP]$/.test(s.id_type)) fail("Selecciona el tipo de RIF (V, E, J, G o P).");
  if (!s.tax_id) fail("Indica el número de RIF.");

  const { error } = await supabaseServer()
    .from("suppliers")
    .update(s)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      fail(`Ya existe otro proveedor con RIF ${s.id_type}-${s.tax_id}.`);
    }
    fail(`No se pudo actualizar el proveedor: ${error.message}`);
  }

  done(`Proveedor «${s.legal_name}» actualizado.`);
}

export async function deleteSupplier(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const legal_name = String(formData.get("legal_name") ?? "proveedor");
  if (!id) fail("Falta identificar el proveedor a eliminar.");

  const { error } = await supabaseServer()
    .from("suppliers")
    .delete()
    .eq("id", id);

  if (error) {
    if (error.code === "23503") {
      fail(
        `No se puede eliminar «${legal_name}»: tiene compras asociadas. Elimínalas primero.`
      );
    }
    fail(`No se pudo eliminar el proveedor: ${error.message}`);
  }

  done(`Proveedor «${legal_name}» eliminado.`);
}
