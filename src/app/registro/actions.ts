"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase";
import { paisPorCodigo } from "@/lib/paises";

function fail(msg: string): never {
  redirect(`/registro?error=${encodeURIComponent(msg)}`);
}

/**
 * Registro de una nueva empresa: crea el usuario de acceso y la empresa
 * con su configuración fiscal según el país elegido. Venezuela arranca
 * con multimoneda (tasa BCV) y un punto de emisión listo para facturar.
 */
export async function registroAction(formData: FormData) {
  const legalName = String(formData.get("legal_name") ?? "").trim();
  const countryCode = String(formData.get("country_code") ?? "VE");
  const taxId = String(formData.get("tax_id") ?? "").trim();
  const fiscalAddress = String(formData.get("fiscal_address") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!legalName || !taxId || !fiscalAddress) {
    fail("Completa los datos de la empresa.");
  }
  if (!email || !password) {
    fail("Completa el correo y la contraseña.");
  }
  if (password.length < 8) {
    fail("La contraseña debe tener al menos 8 caracteres.");
  }
  if (password !== confirm) {
    fail("Las contraseñas no coinciden.");
  }

  const pais = paisPorCodigo(countryCode);

  // Usuario de acceso (creado como administrador: sin espera de correo)
  const { data: created, error: authError } =
    await supabaseServer().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (authError || !created?.user) {
    const msg =
      authError?.message.includes("already") || authError?.message.includes("registered")
        ? "Ese correo ya tiene una cuenta. Inicia sesión."
        : `No se pudo crear la cuenta: ${authError?.message ?? "error desconocido"}`;
    fail(msg);
  }

  // Empresa con su configuración fiscal según el país
  const esVE = pais.code === "VE";
  const { data: company, error: companyError } = await supabaseServer()
    .from("companies")
    .insert({
      legal_name: legalName,
      tax_id: taxId,
      fiscal_address: fiscalAddress,
      email,
      country_code: pais.code,
      currency_code: pais.moneda,
      currency_symbol: pais.simbolo,
      locale: pais.locale,
      tax_name: pais.impuesto,
      tax_id_label: pais.idLabel,
      secondary_currency: esVE ? "VES" : null,
      uses_igtf: esVE,
    })
    .select("id")
    .single();
  if (companyError || !company) {
    const dup = companyError?.message.includes("duplicate");
    // No dejar el usuario huérfano si la empresa falló por RIF duplicado
    if (dup) {
      await supabaseServer().auth.admin.deleteUser(created.user.id);
      fail("Ese identificador fiscal ya está registrado.");
    }
    await supabaseServer().auth.admin.deleteUser(created.user.id);
    fail(`No se pudo registrar la empresa: ${companyError?.message ?? "error"}`);
  }

  // Vincular usuario como administrador de la empresa
  await supabaseServer()
    .from("company_users")
    .insert({ company_id: company.id, user_id: created.user.id, role: "admin" });

  // Venezuela: punto de emisión listo desde el día uno
  if (esVE) {
    await supabaseServer().from("emission_points").insert({
      company_id: company.id,
      branch_code: "01",
      point_code: "01",
      name: "Punto principal",
      emission_type: "free_form",
      control_number_prefix: "00-",
      last_invoice_number: 0,
      last_control_number: 0,
      last_credit_note_number: 0,
      last_debit_note_number: 0,
      is_active: true,
    });
  }

  redirect(
    `/login?ok=${encodeURIComponent(
      "Cuenta creada. Inicia sesión con tu correo y contraseña."
    )}`
  );
}
