"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";

function fail(message: string): never {
  redirect(`/productos?error=${encodeURIComponent(message)}`);
}

function done(message: string): never {
  redirect(`/productos?ok=${encodeURIComponent(message)}`);
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

function parseForm(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const description = String(formData.get("description") ?? "").trim();
  const price_usd = Number(formData.get("price_usd"));
  const vat_rate = Number(formData.get("vat_rate"));
  const applies_vat = formData.get("applies_vat") === "on";

  if (!code) fail("Indica el código del producto.");
  if (!description) fail("Indica la descripción del producto.");
  if (Number.isNaN(price_usd) || price_usd < 0)
    fail("El precio debe ser un número mayor o igual a cero.");
  const vat = applies_vat ? (Number.isNaN(vat_rate) ? 16 : vat_rate) : 0;
  if (![0, 8, 16, 31].includes(vat))
    fail("La alícuota de IVA debe ser 0, 8, 16 o 31 %.");

  return {
    code,
    description,
    price_usd,
    applies_vat,
    vat_rate: vat,
    unit_of_measure: String(formData.get("unit_of_measure") ?? "").trim() || "UND",
    is_service: formData.get("is_service") === "on",
    is_active: formData.get("is_active") === "on",
  };
}

export async function createProduct(formData: FormData) {
  const values = parseForm(formData);
  const company_id = await activeCompanyId();
  if (!company_id) fail("No hay una empresa activa registrada.");

  const { error } = await supabaseServer()
    .from("products")
    .insert({ ...values, company_id });

  if (error) {
    if (error.code === "23505")
      fail(`Ya existe un producto con código ${values.code}.`);
    fail(`No se pudo registrar el producto: ${error.message}`);
  }

  done(`Producto «${values.description}» registrado.`);
}

export async function updateProduct(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) fail("Falta identificar el producto a actualizar.");
  const values = parseForm(formData);

  const { error } = await supabaseServer()
    .from("products")
    .update(values)
    .eq("id", id);

  if (error) {
    if (error.code === "23505")
      fail(`Ya existe otro producto con código ${values.code}.`);
    fail(`No se pudo actualizar el producto: ${error.message}`);
  }

  done(`Producto «${values.description}» actualizado.`);
}

export async function deleteProduct(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const description = String(formData.get("description") ?? "producto");
  if (!id) fail("Falta identificar el producto a eliminar.");

  const { error } = await supabaseServer()
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    if (error.code === "23503") {
      fail(
        `No se puede eliminar «${description}»: tiene facturas o movimientos asociados. Márcalo como inactivo en su lugar.`
      );
    }
    fail(`No se pudo eliminar el producto: ${error.message}`);
  }

  done(`Producto «${description}» eliminado.`);
}
