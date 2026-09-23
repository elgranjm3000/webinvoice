"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { permisos } from "@/lib/permisos";

async function requireAdmin() {
  const p = await permisos();
  if (!p.esAdmin || !p.companyId) {
    redirect("/usuarios?error=" + encodeURIComponent("Solo un administrador puede gestionar usuarios."));
  }
  return p.companyId;
}

/** Crea un usuario de acceso y lo vincula a la empresa con un rol. */
export async function crearUsuario(formData: FormData) {
  const companyId = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const roleId = String(formData.get("role_id") ?? "");

  if (!email || password.length < 8 || !roleId) {
    redirect("/usuarios?error=" + encodeURIComponent("Completa correo, contraseña (mín. 8) y rol."));
  }

  const { data: created, error: authError } =
    await supabaseServer().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (authError || !created?.user) {
    const dup = /already|registered/i.test(authError?.message ?? "");
    redirect(
      "/usuarios?error=" +
        encodeURIComponent(dup ? "Ese correo ya tiene cuenta." : `No se pudo crear: ${authError?.message ?? "error"}`)
    );
  }

  const { error } = await supabaseServer().from("company_users").insert({
    company_id: companyId,
    user_id: created.user.id,
    role_id: roleId,
  });
  if (error) {
    await supabaseServer().auth.admin.deleteUser(created.user.id);
    redirect("/usuarios?error=" + encodeURIComponent(`No se pudo vincular: ${error.message}`));
  }

  revalidatePath("/usuarios");
  redirect("/usuarios?ok=" + encodeURIComponent(`Usuario ${email} creado.`));
}

/** Cambia el rol de un usuario vinculado. */
export async function cambiarRol(formData: FormData) {
  await requireAdmin();
  const { error } = await supabaseServer()
    .from("company_users")
    .update({ role_id: String(formData.get("role_id") ?? "") })
    .eq("id", String(formData.get("id") ?? ""));
  revalidatePath("/usuarios");
  redirect(
    error
      ? `/usuarios?error=${encodeURIComponent(error.message)}`
      : "/usuarios?ok=" + encodeURIComponent("Rol actualizado.")
  );
}

/** Desvincula un usuario de la empresa (la cuenta de acceso se conserva). */
export async function quitarUsuario(formData: FormData) {
  const companyId = await requireAdmin();
  const { error } = await supabaseServer()
    .from("company_users")
    .delete()
    .eq("id", String(formData.get("id") ?? ""))
    .eq("company_id", companyId);
  revalidatePath("/usuarios");
  redirect(
    error
      ? `/usuarios?error=${encodeURIComponent(error.message)}`
      : "/usuarios?ok=" + encodeURIComponent("Usuario desvinculado.")
  );
}

/** Crea un rol con la lista de módulos visibles. */
export async function crearRol(formData: FormData) {
  const companyId = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const modules = formData.getAll("modulos").map(String);
  if (!name) {
    redirect("/usuarios?error=" + encodeURIComponent("Ponle nombre al rol."));
  }
  const { error } = await supabaseServer()
    .from("roles")
    .insert({ company_id: companyId, name, modules });
  revalidatePath("/usuarios");
  redirect(
    error
      ? `/usuarios?error=${encodeURIComponent(error.message)}`
      : `/usuarios?ok=${encodeURIComponent(`Rol «${name}» creado.`)}`
  );
}

/** Actualiza los módulos visibles de un rol. */
export async function actualizarRol(formData: FormData) {
  const companyId = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const modules = formData.getAll("modulos").map(String);
  const { error } = await supabaseServer()
    .from("roles")
    .update({ name, modules })
    .eq("id", id)
    .eq("company_id", companyId);
  revalidatePath("/usuarios");
  redirect(
    error
      ? `/usuarios?error=${encodeURIComponent(error.message)}`
      : `/usuarios?ok=${encodeURIComponent(`Rol «${name}» actualizado.`)}`
  );
}

/** Elimina un rol; los usuarios que lo tenían quedan sin restricción. */
export async function eliminarRol(formData: FormData) {
  const companyId = await requireAdmin();
  const { error } = await supabaseServer()
    .from("roles")
    .delete()
    .eq("id", String(formData.get("id") ?? ""))
    .eq("company_id", companyId);
  revalidatePath("/usuarios");
  redirect(
    error
      ? `/usuarios?error=${encodeURIComponent(error.message)}`
      : "/usuarios?ok=" + encodeURIComponent("Rol eliminado.")
  );
}
